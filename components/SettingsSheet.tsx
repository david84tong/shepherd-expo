import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import auth from '@react-native-firebase/auth';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState, useRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { useUIStore } from '../app/stores/uiStore';
import { useUserStore } from '../app/stores/userStore';

interface SettingsSheetProps {
  settingsSheetRef: React.RefObject<SettingsSheetRef>;
  snapPoints: string[];
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type SettingsSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const SettingsSheet: React.FC<SettingsSheetProps> = ({ settingsSheetRef, snapPoints }) => {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('Anonymous user');
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Handle sheet changes
  const handleSettingsChange = useCallback((index: number) => {
    if (index === -1) {
      // When sheet closes, reset any state if needed
    }
  }, []);

  // Close the settings sheet
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await auth().signOut();
      useUserStore.getState().resetUserStore();
      bottomSheetRef.current?.close();
      setIsModalDimActive(false);
      router.replace('/onboarding/1');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router, setIsModalDimActive]);

  // Handle copying the user ID
  const handleCopyUserId = useCallback(() => {
    Clipboard.setString(userId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Copied!', 'User ID copied to clipboard');
  }, [userId]);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Update user ID when the sheet is shown
  const prepareAndShow = useCallback(() => {
    // Get user ID directly from Firebase or userStore
    let currentUserId = 'Not authenticated';

    // First try to get the current Firebase user's UID
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      currentUserId = currentUser.uid;
    } else {
      // Fallback to userStore
      const user = useUserStore.getState().getUser();
      currentUserId = user?.id || 'Not authenticated';
    }

    setUserId(currentUserId);

    // Show the sheet
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Expose methods via ref
  useImperativeHandle(
    settingsSheetRef,
    () => ({
      show: prepareAndShow,
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [prepareAndShow]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSettingsChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.settingsContentContainer}>
        {/* Header */}
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Sheet Content */}
        <View style={styles.settingsContent}>
          {/* User ID Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>User ID</Text>
            <View style={styles.userIdContainer}>
              <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">
                {userId}
              </Text>
              <TouchableOpacity onPress={handleCopyUserId} style={styles.copyButton}>
                <Feather name="copy" size={16} color="#3C584A" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Placeholder for future settings */}
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.settingsText}>More settings coming soon...</Text>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  copyButton: {
    padding: 5,
  },
  divider: {
    backgroundColor: '#FFE4A8',
    height: 1,
    marginVertical: 20,
  },
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsContentContainer: {
    flex: 1,
  },
  settingsHeader: {
    alignItems: 'center',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
    marginBottom: 10,
  },
  settingsText: {
    color: 'rgba(60, 88, 74, 0.7)',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  settingsTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  signOutButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.1)',
    borderLeftColor: '#DF4533',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
  },
  signOutText: {
    color: '#DF4533',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  userIdContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userIdText: {
    color: '#3C584A',
    flexShrink: 1,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginRight: 10, // Allow text to shrink
  },
});

export default SettingsSheet;
