import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStoragePlugin from 'i18next-react-native-async-storage';
import * as Localization from 'expo-localization';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      navigation: {
        home: 'Home',
        history: 'Library',
        settings: 'Settings',
      },
      // Onboarding
      onboarding: {
        title: 'Any screenshot → instant action.',
        subtitle: 'Turn any screenshot into actionable items with AI',
        getStarted: 'Get started',
        privacyNote: 'Your photos stay private - we only extract text.',
      },
      
      // Home
      home: {
        emptyTitle: 'Ready to get started?',
        emptySubtitle: 'Take a photo or pick from gallery to turn it into an actionable item',
        takePhoto: 'Take Photo',
        pickFromGallery: 'Pick from Gallery',
        selectSource: 'Select Image Source',
        selectSourceMessage: 'How would you like to add an image?',
        shareHint: 'You can also share from your gallery to this app.',
      },
      
      // Upload/Progress
      upload: {
        processing: 'Processing your image...',
        extractingText: 'Extracting text',
        analyzingContent: 'Analyzing content',
        almostDone: 'Almost done',
        backgroundNote: 'You can leave the app - we\'ll finish in the background',
      },
      
      // Result
      result: {
        autoExtracted: 'Auto-extracted—edit fields if needed.',
        addToCalendar: 'Add to Calendar',
        saveAsExpense: 'Save as Expense',
        saveContact: 'Save Contact',
        openInMaps: 'Open in Maps',
        saveNote: 'Save Note',
        saveDocument: 'Save Document',
        successToast: 'Action completed successfully!',
        fieldsSaved: 'Fields updated successfully!',
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
      },
      
      // History
      history: {
        title: 'Library',
        empty: 'No items yet',
        emptySubtitle: 'Your processed items will appear here',
        filterAll: 'All',
        filterFavorites: 'Favorites',
        filterEvents: 'Events',
        filterExpenses: 'Expenses',
        filterContacts: 'Contacts',
        filterAddresses: 'Addresses',
        filterNotes: 'Notes',
        filterDocuments: 'Documents',
        itemDeleted: 'Item deleted successfully',
        favoriteAdded: 'Added to favorites',
        favoriteRemoved: 'Removed from favorites',
        titleUpdated: 'Title updated successfully',
        sortBy: 'Sort By',
        sortNewest: 'Newest First',
        sortOldest: 'Oldest First',
        sortFavorites: 'Favorites First',
        searchPlaceholder: 'Search items...',
      },
      
      // Settings
      settings: {
        title: 'Settings',
        language: 'Language',
        theme: 'Theme',
        help: 'Help & Support',
        privacy: 'Privacy Policy',
        about: 'About PicDo',
        version: 'Version',
        themeAuto: 'Auto',
        themeLight: 'Light',
        themeDark: 'Dark',
      },
      
      // Types
      types: {
        event: 'Event',
        expense: 'Expense',
        contact: 'Contact',
        address: 'Address',
        note: 'Note',
        document: 'Document',
      },
      
      // Fields
      fields: {
        title: 'Title',
        date: 'Date',
        time: 'Time',
        location: 'Location',
        url: 'URL',
        amount: 'Amount',
        currency: 'Currency',
        merchant: 'Merchant',
        name: 'Name',
        phone: 'Phone',
        address: 'Address',
        description: 'Description',
        content: 'Content',
        category: 'Category',
      },
      
      // Share Actions
      share: {
        extractText: 'Extract Text with PicDo',
        processImage: 'Process Image with PicDo',
        aiAnalysis: 'AI Analysis with PicDo',
        quickAction: 'Quick Action',
      },
      
      // Errors
      errors: {
        networkError: 'Network error. Please check your connection.',
        uploadFailed: 'Upload failed. Please try again.',
        processingFailed: 'Couldn\'t process this image. Try a clearer one.',
        limitReached: 'You reached this month\'s limit (50). It resets next month.',
        permissionDenied: 'Permission denied. Please check app settings.',
        cameraPermissionDenied: 'Camera permission denied. Please enable camera access in settings.',
        inappropriateContent: 'This image cannot be processed. Please try a different image.',
        maintenanceMode: 'Service temporarily unavailable for maintenance. Please try again later.',
        unknownError: 'Something went wrong. Please try again.',
        noImageSelected: 'No image selected',
        invalidImage: 'Invalid image format',
        noTextDetected: 'No text found in this image. Try a clearer photo with visible text.',
        noTextTitle: 'No Text Found',
        jobNotFound: 'Job not found or expired',
        saveFailed: 'Failed to save changes. Please try again.',
        deleteFailed: 'Failed to delete item. Please try again.',
        favoriteFailed: 'Failed to update favorite. Please try again.',
        updateFailed: 'Failed to update title. Please try again.',
      },
      
      // Common
      common: {
        ok: 'OK',
        cancel: 'Cancel',
        retry: 'Retry',
        close: 'Close',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        yes: 'Yes',
        no: 'No',
        continue: 'Continue',
        back: 'Back',
        next: 'Next',
        done: 'Done',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        share: 'Share',
        copy: 'Copy',
        copied: 'Copied!',
      },
    },
  },
  ar: {
    translation: {
      // Navigation
      navigation: {
        home: 'الرئيسية',
        history: 'المكتبة',
        settings: 'الإعدادات',
      },
      // Onboarding
      onboarding: {
        title: 'أي سكرينشوت ← فعل فوري.',
        subtitle: 'حوّل أي سكرينشوت إلى عناصر قابلة للتنفيذ بالذكاء الاصطناعي',
        getStarted: 'ابدأ الآن',
        privacyNote: 'صورك تبقى خاصة - نستخرج النص فقط.',
      },
      
      // Home
      home: {
        emptyTitle: 'جاهز للبدء؟',
        emptySubtitle: 'التقط صورة أو اختر من المعرض لتحويلها إلى عنصر قابل للتنفيذ',
        takePhoto: 'التقط صورة',
        pickFromGallery: 'اختر من المعرض',
        selectSource: 'اختر مصدر الصورة',
        selectSourceMessage: 'كيف تريد إضافة صورة؟',
        shareHint: 'يمكنك أيضاً مشاركة صورة من المعرض لهذا التطبيق.',
      },
      
      // Upload/Progress
      upload: {
        processing: 'جاري معالجة الصورة...',
        extractingText: 'استخراج النص',
        analyzingContent: 'تحليل المحتوى',
        almostDone: 'تقريباً انتهينا',
        backgroundNote: 'يمكنك ترك التطبيق - سننتهي في الخلفية',
      },
      
      // Result
      result: {
        autoExtracted: 'تم الاستخراج تلقائياً - عدّل الحقول إذا لزم الأمر.',
        addToCalendar: 'أضف للتقويم',
        saveAsExpense: 'احفظ كمصروف',
        saveContact: 'احفظ جهة الاتصال',
        openInMaps: 'افتح في الخرائط',
        saveNote: 'احفظ الملاحظة',
        saveDocument: 'احفظ المستند',
        successToast: 'تم تنفيذ الإجراء بنجاح!',
        fieldsSaved: 'تم تحديث الحقول بنجاح!',
        edit: 'تعديل',
        save: 'حفظ',
        cancel: 'إلغاء',
      },
      
      // History
      history: {
        title: 'المكتبة',
        empty: 'لا توجد عناصر بعد',
        emptySubtitle: 'ستظهر العناصر المعالجة هنا',
        filterAll: 'الكل',
        filterFavorites: 'المفضلة',
        filterEvents: 'الأحداث',
        filterExpenses: 'المصروفات',
        filterContacts: 'جهات الاتصال',
        filterAddresses: 'العناوين',
        filterNotes: 'الملاحظات',
        filterDocuments: 'المستندات',
        itemDeleted: 'تم حذف العنصر بنجاح',
        favoriteAdded: 'تم إضافة إلى المفضلة',
        favoriteRemoved: 'تم إزالة من المفضلة',
        titleUpdated: 'تم تحديث العنوان بنجاح',
        sortBy: 'ترتيب حسب',
        sortNewest: 'الأحدث أولاً',
        sortOldest: 'الأقدم أولاً',
        sortFavorites: 'المفضلة أولاً',
        searchPlaceholder: 'البحث في العناصر...',
      },
      
      // Settings
      settings: {
        title: 'الإعدادات',
        language: 'اللغة',
        theme: 'المظهر',
        help: 'المساعدة والدعم',
        privacy: 'سياسة الخصوصية',
        about: 'حول PicDo',
        version: 'الإصدار',
        themeAuto: 'تلقائي',
        themeLight: 'فاتح',
        themeDark: 'داكن',
      },
      
      // Types
      types: {
        event: 'حدث',
        expense: 'مصروف',
        contact: 'جهة اتصال',
        address: 'عنوان',
        note: 'ملاحظة',
        document: 'مستند',
      },
      
      // Fields
      fields: {
        title: 'العنوان',
        date: 'التاريخ',
        time: 'الوقت',
        location: 'الموقع',
        url: 'الرابط',
        amount: 'المبلغ',
        currency: 'العملة',
        merchant: 'التاجر',
        name: 'الاسم',
        phone: 'الهاتف',
        address: 'العنوان',
        description: 'الوصف',
        content: 'المحتوى',
        category: 'الفئة',
      },
      
      // Share Actions
      share: {
        extractText: 'استخراج النص مع بيك دو',
        processImage: 'معالجة الصورة مع بيك دو',
        aiAnalysis: 'التحليل الذكي مع بيك دو',
        quickAction: 'إجراء سريع',
      },
      
      // Errors
      errors: {
        networkError: 'خطأ في الشبكة. يرجى التحقق من الاتصال.',
        uploadFailed: 'فشل في الرفع. يرجى المحاولة مرة أخرى.',
        processingFailed: 'لا يمكن معالجة هذه الصورة. جرب صورة أوضح.',
        limitReached: 'لقد وصلت إلى الحد الشهري (50). سيتم إعادة تعيينه الشهر القادم.',
        permissionDenied: 'تم رفض الإذن. يرجى التحقق من إعدادات التطبيق.',
        cameraPermissionDenied: 'تم رفض إذن الكاميرا. يرجى تفعيل الوصول للكاميرا في الإعدادات.',
        inappropriateContent: 'لا يمكن معالجة هذه الصورة. يرجى تجربة صورة أخرى.',
        maintenanceMode: 'الخدمة غير متاحة مؤقتاً للصيانة. يرجى المحاولة لاحقاً.',
        unknownError: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
        noImageSelected: 'لم يتم اختيار صورة',
        invalidImage: 'تنسيق صورة غير صالح',
        noTextDetected: 'لم يتم العثور على نص في هذه الصورة. جرب صورة أوضح تحتوي على نص مرئي.',
        noTextTitle: 'لم يتم العثور على نص',
        jobNotFound: 'المهمة غير موجودة أو منتهية الصلاحية',
        saveFailed: 'فشل في حفظ التغييرات. يرجى المحاولة مرة أخرى.',
        deleteFailed: 'فشل في حذف العنصر. يرجى المحاولة مرة أخرى.',
        favoriteFailed: 'فشل في تحديث المفضلة. يرجى المحاولة مرة أخرى.',
        updateFailed: 'فشل في تحديث العنوان. يرجى المحاولة مرة أخرى.',
      },
      
      // Common
      common: {
        ok: 'موافق',
        cancel: 'إلغاء',
        retry: 'إعادة المحاولة',
        close: 'إغلاق',
        loading: 'جاري التحميل...',
        error: 'خطأ',
        success: 'نجح',
        warning: 'تحذير',
        info: 'معلومات',
        yes: 'نعم',
        no: 'لا',
        continue: 'متابعة',
        back: 'رجوع',
        next: 'التالي',
        done: 'تم',
        save: 'حفظ',
        delete: 'حذف',
        edit: 'تعديل',
        share: 'مشاركة',
        copy: 'نسخ',
        copied: 'تم النسخ!',
      },
    },
  },
};

// Initialize i18n
i18n
  .use(AsyncStoragePlugin('picdo_language'))
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.locale.split('-')[0] || 'en',
    fallbackLng: 'en',
    debug: __DEV__,
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export const getCurrentLanguage = () => {
  const lang = i18n.language;
  console.log(`🌍 getCurrentLanguage() -> "${lang}"`);
  return lang;
};
export const isRTL = () => i18n.language === 'ar';

export default i18n;
