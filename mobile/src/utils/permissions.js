import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';

export const requestCameraPermission = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

export const requestCalendarPermission = async () => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting calendar permission:', error);
    return false;
  }
};

export const requestContactsPermission = async () => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
};

export const checkAllPermissions = async () => {
  try {
    const [camera, mediaLibrary, calendar, contacts] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Calendar.getCalendarPermissionsAsync(),
      Contacts.getPermissionsAsync(),
    ]);

    return {
      camera: camera.status === 'granted',
      mediaLibrary: mediaLibrary.status === 'granted',
      calendar: calendar.status === 'granted',
      contacts: contacts.status === 'granted',
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      camera: false,
      mediaLibrary: false,
      calendar: false,
      contacts: false,
    };
  }
};
