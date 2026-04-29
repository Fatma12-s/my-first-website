(function () {
	const form = document.getElementById('graduates-form');
	if (!form) return;

	const attachmentFields = ['applicantPhoto', 'cvFile', 'idCardCopy', 'universityLetter', 'otherAttachments', 'receipt'];
	const isRemoteAttachmentUrl = (value) => /^https:\/\//i.test(String(value || '').trim());
	const withLocalTimeout = (promise, timeoutMs, timeoutMessage) => Promise.race([
		promise,
		new Promise((_, reject) => {
			setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
		})
	]);
	const maybeNotify = async (payload, responsible) => {
		if (typeof sendNotificationEmail !== 'function') return false;
		try {
			await sendNotificationEmail(payload, responsible, 'confirm');
			return true;
		} catch (error) {
			console.error('❌ تعذر إرسال بريد الإشعار بعد حفظ الطلب:', error);
			return false;
		}
	};

	let saveFormDataOverride;

	saveFormDataOverride = async function (formName, formData) {
		const sanitize = (data) => {
			const out = {};
			for (const [key, value] of Object.entries(data || {})) {
				if (String(key).startsWith('__')) continue;
				try {
					if (typeof File !== 'undefined' && value instanceof File) {
						out[key] = value;
					} else if (typeof FileList !== 'undefined' && value instanceof FileList) {
						out[key] = Array.from(value);
					} else {
						out[key] = value;
					}
				} catch (_) {
					out[key] = value;
				}
			}
			return out;
		};

		const toAttachmentMeta = (file, uploadResult, extra) => {
			if (!file) return undefined;
			const normalizedResult = uploadResult && typeof uploadResult === 'object' ? uploadResult : {};
			const fallback = extra && typeof extra === 'object' ? extra : {};
			const url = typeof normalizedResult.url === 'string' ? normalizedResult.url.trim() : '';
			const status = typeof normalizedResult.status === 'string' ? normalizedResult.status.trim() : '';
			const message = typeof normalizedResult.message === 'string' ? normalizedResult.message.trim() : '';
			const meta = {
				name: String(normalizedResult.name || file.name || fallback.name || 'attachment'),
				type: String(normalizedResult.type || file.type || fallback.type || 'application/octet-stream'),
				size: Number(normalizedResult.size || file.size || fallback.size || 0),
				source: url ? 'firebase-url' : 'upload-result'
			};
			if (url) meta.url = url;
			if (status) meta.status = status;
			if (message) meta.message = message;
			return meta;
		};

		const toPersistableValue = (value) => {
			if (value === undefined) return undefined;
			if (value === null) return null;
			if (typeof File !== 'undefined' && value instanceof File) return undefined;
			if (typeof FileList !== 'undefined' && value instanceof FileList) return undefined;
			if (Array.isArray(value)) {
				return value
					.map((item) => toPersistableValue(item))
					.filter((item) => item !== undefined);
			}
			if (typeof value === 'object') {
				const out = {};
				for (const [key, nestedValue] of Object.entries(value)) {
					const normalizedNested = toPersistableValue(nestedValue);
					if (normalizedNested !== undefined) out[key] = normalizedNested;
				}
				return out;
			}
			return value;
		};

		const clonePlainData = (value) => {
			try {
				return JSON.parse(JSON.stringify(value));
			} catch (_) {
				return value;
			}
		};

		const cleaned = sanitize(formData);
		cleaned.submittedAt = new Date().toLocaleString('ar-SA');
		cleaned.submittedAtISO = new Date().toISOString();
		cleaned.id = Date.now();
		cleaned.formType = formName;
		delete cleaned.applicantPhotoDataUrl;

		await Promise.all(attachmentFields.map(async (field) => {
			if (!(formData[field] && formData[field] instanceof File)) return;
			const file = formData[field];
			try {
				const uploadResult = await window.fileUpload.uploadAttachment(file, field, cleaned);
				const attachmentMeta = toAttachmentMeta(file, uploadResult);
				if (attachmentMeta) {
					cleaned[field] = attachmentMeta;
				} else {
					delete cleaned[field];
				}
			} catch (uploadError) {
				console.error('❌ فشل غير متوقع أثناء تجهيز المرفق:', field, uploadError);
				cleaned[field + 'URL'] = '';
				cleaned[field] = toAttachmentMeta(file, null, {
					status: 'upload_failed',
					message: 'فشل رفع الملف'
				});
			}
		}));

		let forceLocalFallback = false;
		let localFallbackReason = '';

		const requiredRemoteAttachments = ['cvFile', 'idCardCopy', 'universityLetter'];
		const missingRequiredAttachments = requiredRemoteAttachments.filter((field) => {
			const attachment = cleaned[field];
			return !(attachment && typeof attachment === 'object' && isRemoteAttachmentUrl(attachment.url));
		});
		if (missingRequiredAttachments.length) {
			forceLocalFallback = true;
			localFallbackReason = 'تعذر رفع بعض المرفقات المطلوبة إلى Firebase Storage، لذلك تم حفظ الطلب محلياً على هذا الجهاز.';
		}

		if (formName === 'graduates') {
			cleaned.department = cleaned.department || cleaned.specialtyDepartment || '';
			if (!cleaned.duration) {
				const from = cleaned.durationFrom || '';
				const to = cleaned.durationTo || '';
				cleaned.duration = from && to ? from + ' -> ' + to : (from || to || '');
			}
		}

		cleaned.status = 'Pending';
		const responsible = assignResponsible(formName);
		cleaned.assignedTo = responsible.name;
		cleaned.assignedEmail = responsible.email;
		cleaned.createdAt = new Date().toISOString();

		for (const field of attachmentFields) {
			const attachmentValue = cleaned[field];
			if (attachmentValue === undefined || attachmentValue === null) {
				delete cleaned[field];
				continue;
			}
			if (typeof File !== 'undefined' && attachmentValue instanceof File) {
				delete cleaned[field];
				continue;
			}
			if (typeof attachmentValue === 'object') {
				const hasAttachmentMetadata = ['name', 'url', 'status', 'message', 'type', 'size'].some((key) => {
					const fieldValue = attachmentValue[key];
					return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
				});
				if (!hasAttachmentMetadata) delete cleaned[field];
			}
		}

		const persistableCleaned = toPersistableValue(cleaned) || {};
		delete persistableCleaned.__applicantPhotoDataUrl;
		for (const [key, value] of Object.entries(persistableCleaned)) {
			if (value === undefined) delete persistableCleaned[key];
		}

		const resultData = clonePlainData(persistableCleaned) || {};
		if (cleaned.__applicantPhotoDataUrl) {
			resultData.__applicantPhotoDataUrl = String(cleaned.__applicantPhotoDataUrl);
		}
		if (localFallbackReason) {
			resultData.__localFallbackReason = localFallbackReason;
		}

		if (forceLocalFallback) {
			saveToLocalStorage(formName, clonePlainData(persistableCleaned));
			maybeNotify(persistableCleaned, responsible);
			return { success: true, data: resultData, local: true, fallback: 'localStorage', reason: localFallbackReason };
		}

		if (window.db) {
			try {
				const firestorePayload = clonePlainData(persistableCleaned);
				await withLocalTimeout(window.db.collection('formSubmissions').add(firestorePayload), 6000, 'Firestore save timed out');
				maybeNotify(persistableCleaned, responsible);
				return { success: true, data: resultData, firestore: true, emailQueued: true };
			} catch (err) {
				console.error('❌ خطأ في حفظ البيانات في Firestore:', err);
				saveToLocalStorage(formName, clonePlainData(persistableCleaned));
				maybeNotify(persistableCleaned, responsible);
				return { success: true, data: resultData, error: err, local: true, fallback: 'localStorage' };
			}
		}

		saveToLocalStorage(formName, clonePlainData(persistableCleaned));
		maybeNotify(persistableCleaned, responsible);
		return { success: true, data: resultData, local: true, emailQueued: true };
	};

	window.saveFormData = saveFormDataOverride;
	saveFormData = saveFormDataOverride;
})();
