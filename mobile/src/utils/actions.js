import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { requestCalendarPermission, requestContactsPermission } from './permissions';

export const addEventToCalendar = async (eventData) => {
  try {
    const hasPermission = await requestCalendarPermission();
    if (!hasPermission) {
      throw new Error('Calendar permission denied');
    }

    // Get default calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.source.name === 'Default') || calendars[0];

    if (!defaultCalendar) {
      throw new Error('No calendar available');
    }

    // Parse date and time
    const eventDate = new Date(eventData.date + 'T' + (eventData.time || '00:00'));
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const eventDetails = {
      title: eventData.title,
      startDate: eventDate,
      endDate: endDate,
      location: eventData.location || '',
      notes: eventData.url || '',
      timeZone: Calendar.getTimeZone(),
      alarms: [{ relativeOffset: -15 }], // 15 minutes before
    };

    const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
    return { success: true, eventId };

  } catch (error) {
    console.error('Error adding event to calendar:', error);
    return { success: false, error: error.message };
  }
};

export const saveContact = async (contactData) => {
  try {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      throw new Error('Contacts permission denied');
    }

    const contact = {
      name: contactData.name,
      phoneNumbers: contactData.phone ? [{ label: 'mobile', number: contactData.phone }] : [],
    };

    const contactId = await Contacts.addContactAsync(contact);
    return { success: true, contactId };

  } catch (error) {
    console.error('Error saving contact:', error);
    return { success: false, error: error.message };
  }
};

export const openInMaps = async (addressData) => {
  try {
    const query = encodeURIComponent(addressData.mapsQuery || addressData.full);
    
    let url;
    if (Platform.OS === 'ios') {
      url = `maps://app?q=${query}`;
      // Fallback to Apple Maps web
      const fallbackUrl = `http://maps.apple.com/?q=${query}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } else {
      // Android - Google Maps
      url = `geo:0,0?q=${query}`;
      const fallbackUrl = `https://maps.google.com/?q=${query}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error opening maps:', error);
    return { success: false, error: error.message };
  }
};

export const saveExpense = async (expenseData) => {
  try {
    // For MVP, we just mark it as saved on the server
    // In a full implementation, this might integrate with expense tracking apps
    return { success: true };
  } catch (error) {
    console.error('Error saving expense:', error);
    return { success: false, error: error.message };
  }
};

export const saveNote = async (noteData) => {
  try {
    // For MVP, we just mark it as saved on the server
    // In a full implementation, this might integrate with note-taking apps
    return { success: true };
  } catch (error) {
    console.error('Error saving note:', error);
    return { success: false, error: error.message };
  }
};

export const executeAction = async (type, data) => {
  switch (type) {
    case 'calendar':
      return await addEventToCalendar(data);
    case 'contact':
      return await saveContact(data);
    case 'maps':
      return await openInMaps(data);
    case 'expense':
      return await saveExpense(data);
    case 'note':
      return await saveNote(data);
    default:
      return { success: false, error: 'Unknown action type' };
  }
};
