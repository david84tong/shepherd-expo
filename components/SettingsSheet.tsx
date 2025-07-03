import React, { useCallback, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated from 'react-native-reanimated';
import i18n from '~/app/utils/i18n';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { useSettingSheet } from '~/app/hooks/useSettingsSheet';

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
  const {
    // Refs
    bottomSheetRef,

    // States
    isVisible,
    translationModalVisible,
    showTimePicker,
    showAndroidPicker,
    selectedLanguage,
    languageModalVisible,
    userId,
    isUserSignedIn,
    savedTranslation,
    tempSelectedTranslation,
    isSavingTranslation,
    notificationsEnabled,
    selectedTime,
    referralModalVisible,
    referralInput,
    isSubmittingReferral,
    cancellationModalVisible,
    cancellationReasons,
    cancellationFeedback,
    isSubmittingCancellation,
    readingTimeModalVisible,
    selectedReadingTime,
    showDevPanel,
    devPanelExpanded,
    streakData,
    devPanelLoading,
    userData,
    backgroundMusicEnabled,
    soundEffectsEnabled,
    hapticsEnabled,
    isProMember,
    // Functions
    handleSettingsChange,
    handleClose,
    handleSignOut,
    handleCopyUserId,
    handleTempTranslationSelect,
    handleSaveTranslation,
    handleOpenTranslationModal,
    getNotificationTimeDisplay,
    toggleTimePicker,
    handleTimeConfirm,
    animateToggle,
    handleCancelTranslation,
    handleOpenDiscord,
    handleOpenRoadmap,
    handleDeleteAccount,
    handleSubscriptionPress,
    toggleDevPanel,
    refreshStreakData,
    toggleDevPanelExpanded,
    formatDate,
    handleOpenReferralModal,
    handleReferralSubmit,
    handleReadingTimeSelection,
    handleOpenCancellationModal,
    toggleCancellationReason,
    handleSubmitCancellation,
    setBackgroundMusicEnabled,
    setSoundEffectsEnabled,
    setHapticsEnabled,
    handleLanguageChange,
    setLanguageModalVisible,
    setSelectedTime,
    setShowAndroidPicker,
    setReferralModalVisible,
    setReferralInput,
    setReadingTimeModalVisible,
    setSelectedReadingTime,
    setCancellationModalVisible,
    setCancellationFeedback,
    prepareAndShow,
    setIsVisible,
    // Animated styles
    timePickerAnimatedStyle,
    selectorButtonStyle,
    // Constants
    translations,
    appVersion,
    buildNumber
  } = useSettingSheet(settingsSheetRef);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  useImperativeHandle(
    settingsSheetRef,
    () => ({
      show: prepareAndShow,
      close: () => {
        hapticLight();
        setIsVisible(false);
        bottomSheetRef.current?.close();
      },
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [prepareAndShow]
  );


  return (
    <>
      {isVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onChange={handleSettingsChange}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          backdropComponent={renderBackdrop}>
          <BottomSheetScrollView
            style={styles.settingsContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.settingsContentContainer}>
            {/* Header */}
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>{i18n.t('settings_title')}</Text>
              <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
                <Text style={styles.doneButton}>{i18n.t('done_button')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sheet Content */}
            <View style={styles.settingsContent}>
              {/* Bible Translation Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('bible_translation_title')}</Text>
                <TouchableOpacity
                  style={styles.translationSelector}
                  onPress={handleOpenTranslationModal}>
                  <Text style={styles.translationText}>
                    {translations.find((t) => t.id === savedTranslation)?.name ||
                      'English Standard Version (ESV)'}
                  </Text>
                  <Feather name="chevron-right" size={18} color="#3C584A" />
                </TouchableOpacity>
              </View>

              {/* Language Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('language_title')}</Text>
                <TouchableOpacity
                  style={styles.translationSelector}
                  onPress={() => setLanguageModalVisible(true)}>
                  <Text style={styles.translationText}>
                    {(() => {
                      switch (selectedLanguage) {
                        case 'en': return 'English';
                        case 'es': return 'Español';
                        case 'pt': return 'Português';
                        case 'nl': return 'Nederlands';
                        case 'fr': return 'Français';
                        case 'de': return 'Deutsch';
                        default: return 'English';
                      }
                    })()}
                  </Text>
                  <Feather name="chevron-right" size={18} color="#3C584A" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Daily Reading Time Section */}
              {/* <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('daily_reading_time_title')}</Text>
                <TouchableOpacity
                  style={styles.translationSelector}
                  onPress={handleEditReadingTime}>
                  <Text style={styles.translationText}>{getReadingTimeDisplay()}</Text>
                  <Feather name="chevron-right" size={18} color="#3C584A" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} /> */}

              {/* Notification Time Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('notifications_title')}</Text>

                {/* Toggle for enabling/disabling notifications */}
                <TouchableOpacity
                  style={styles.translationSelector}
                  onPress={() => animateToggle(!notificationsEnabled)}
                  activeOpacity={0.7}>
                  <Text style={styles.translationText}>
                    {notificationsEnabled ? i18n.t('notifications_enabled') : i18n.t('notifications_disabled')}
                  </Text>
                  <View
                    style={[
                      styles.toggleButton,
                      notificationsEnabled ? styles.toggleButtonActive : {},
                    ]}>
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        notificationsEnabled ? styles.toggleKnobActive : {},
                        {
                          transform: [{ translateX: notificationsEnabled ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {notificationsEnabled && (
                  <Animated.View style={selectorButtonStyle}>
                    <TouchableOpacity
                      style={[styles.timeSelector, showTimePicker && styles.timeSelectorActive]}
                      onPress={toggleTimePicker}>
                      <Text style={styles.timeSelectorText}>{getNotificationTimeDisplay()}</Text>
                      <Feather
                        name={showTimePicker ? 'chevron-up' : 'clock'}
                        size={18}
                        color="#3C584A"
                      />
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Time Picker Section */}
                {notificationsEnabled && Platform.OS === 'ios' && (
                  <Animated.View
                    style={[
                      styles.timePickerContainer,
                      timePickerAnimatedStyle,
                      showTimePicker ? null : { height: 0, opacity: 0, overflow: 'hidden' },
                    ]}>
                    <View style={styles.timePickerWrapper}>
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        is24Hour={false}
                        display="spinner"
                        onChange={(event, date) => date && setSelectedTime(date)}
                        style={styles.timePicker}
                        accentColor="#3C584A"
                        themeVariant="light"
                      />
                    </View>

                    <TouchableOpacity style={styles.donePickingButton} onPress={handleTimeConfirm}>
                      <Text style={styles.donePickingText}>Done</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Android Time Picker */}
                {Platform.OS === 'android' && showAndroidPicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, date) => {
                      setShowAndroidPicker(false);
                      if (event.type !== 'dismissed' && date) {
                        handleTimeConfirm(event, date);
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.divider} />

              {/* Sound Settings Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('sound_title')}</Text>

                {/* Background Music Toggle */}
                <TouchableOpacity
                  style={styles.translationSelector}
                  onPress={() => {
                    hapticLight();
                    setBackgroundMusicEnabled(!backgroundMusicEnabled);
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.translationText}>
                    {backgroundMusicEnabled
                      ? i18n.t('background_music_enabled')
                      : i18n.t('background_music_disabled')}
                  </Text>
                  <View
                    style={[
                      styles.toggleButton,
                      backgroundMusicEnabled ? styles.toggleButtonActive : {},
                    ]}>
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        backgroundMusicEnabled ? styles.toggleKnobActive : {},
                        {
                          transform: [{ translateX: backgroundMusicEnabled ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Sound Effects Toggle */}
                <TouchableOpacity
                  style={[styles.translationSelector, { marginTop: 10 }]}
                  onPress={() => {
                    hapticLight();
                    setSoundEffectsEnabled(!soundEffectsEnabled);
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.translationText}>
                    {soundEffectsEnabled ? i18n.t('sound_effects_enabled') : i18n.t('sound_effects_disabled')}
                  </Text>
                  <View
                    style={[
                      styles.toggleButton,
                      soundEffectsEnabled ? styles.toggleButtonActive : {},
                    ]}>
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        soundEffectsEnabled ? styles.toggleKnobActive : {},
                        {
                          transform: [{ translateX: soundEffectsEnabled ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Haptics Toggle */}
                <TouchableOpacity
                  style={[styles.translationSelector, { marginTop: 10 }]}
                  onPress={() => {
                    hapticLight();
                    setHapticsEnabled(!hapticsEnabled);
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.translationText}>
                    {hapticsEnabled ? i18n.t('haptics_enabled') : i18n.t('haptics_disabled')}
                  </Text>
                  <View
                    style={[
                      styles.toggleButton,
                      hapticsEnabled ? styles.toggleButtonActive : {},
                    ]}>
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        hapticsEnabled ? styles.toggleKnobActive : {},
                        {
                          transform: [{ translateX: hapticsEnabled ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Join Discord */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('community_title')}</Text>
                <TouchableOpacity style={styles.discordButton} onPress={handleOpenDiscord}>
                  <View style={styles.discordButtonContent}>
                    <FontAwesome6 name="discord" size={20} color="#5865F2" />
                    <Text style={styles.discordButtonText}>{i18n.t('join_discord')}</Text>
                  </View>
                  <Feather name="external-link" size={18} color="#3C584A" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.roadmapButton} onPress={handleOpenRoadmap}>
                  <View style={styles.roadmapButtonContent}>
                    <Feather name="map" size={20} color="#22C55E" />
                    <Text style={styles.roadmapButtonText}>{i18n.t('roadmap_feature_requests')}</Text>
                  </View>
                  <Feather name="external-link" size={18} color="#3C584A" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Subscription Section */}
              <View className="mb-6">
                <Text className="font-feather text-xl text-[#5D5531] mb-2">{i18n.t('subscription_title')}</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                      <Text className="font-feather text-base text-textPrimary">
                        {isProMember ? i18n.t('super_shepherd_active') : i18n.t('upgrade_super_shepherd')}
                      </Text>
                      <Text className="font-din text-description mt-1">
                        {isProMember
                          ? i18n.t('thank_you_support')
                          : i18n.t('unlock_premium')}
                      </Text>
                    </View>
                    {isProMember ? (
                      <TouchableOpacity
                        onPress={handleOpenCancellationModal}
                        className="bg-red/10 px-4 py-2 rounded-lg border border-red">
                        <Text className="font-feather text-red">Cancel</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={handleSubscriptionPress}
                        className="bg-[#FFE07D] px-4 py-2 rounded-lg">
                        <Text className="font-feather text-textPrimary">Upgrade</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Promo Code Button */}

                {/* Referral Code Button */}
                <TouchableOpacity
                  onPress={handleOpenReferralModal}
                  className="bg-white rounded-xl p-4 mt-2 shadow-sm flex-row justify-between items-center">
                  <View>
                    <Text className="font-feather text-base text-textPrimary">{i18n.t('referral_code_title')}</Text>
                    <Text className="font-din text-description mt-1">{i18n.t('referral_code_description')}</Text>
                  </View>
                  <Feather name="gift" size={20} color="#B89B4C" />
                </TouchableOpacity>
              </View>

              {/* User ID Section - Moved to bottom */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{i18n.t('user_id_title')}</Text>
                <TouchableOpacity onPress={handleCopyUserId} style={styles.userIdContainer}>
                  <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">
                    {userId}
                  </Text>
                  <View style={styles.copyButton}>
                    <Feather name="copy" size={16} color="#3C584A" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sign Out Button - Only show if user is signed in */}
              {isUserSignedIn && (
                <>
                  <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>{i18n.t('sign_out_button')}</Text>
                  </TouchableOpacity>

                  {/* Delete Account Button */}
                  <TouchableOpacity
                    onPress={handleDeleteAccount}
                    style={styles.deleteAccountButton}>
                    <Text style={styles.deleteAccountText}>{i18n.t('delete_account_button')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Developer Panel Toggle */}
              <TouchableOpacity onPress={toggleDevPanel} style={styles.developerToggleButton}>
                <Text style={styles.developerToggleText}>
                  {showDevPanel ? i18n.t('hide_developer_panel') : i18n.t('show_developer_panel')}
                </Text>
              </TouchableOpacity>

              {/* Developer Panel */}
              {showDevPanel && (
                <View style={styles.developerPanel}>
                  <View style={styles.developerPanelHeader}>
                    <Text style={styles.developerPanelTitle}>{i18n.t('developer_panel_title')}</Text>
                    {devPanelLoading ? (
                      <ActivityIndicator size="small" color="#3C584A" />
                    ) : (
                      <TouchableOpacity
                        onPress={refreshStreakData}
                        style={styles.refreshButton}
                        disabled={devPanelLoading}>
                        <Feather name="refresh-cw" size={16} color="#3C584A" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* App Version Info Section */}
                  <View style={styles.developerPanelSection}>
                    <Text style={styles.developerPanelSectionTitle}>{i18n.t('app_information_title')}</Text>
                    <View style={styles.developerDataRow}>
                      <Text style={styles.developerDataLabel}>{i18n.t('version')}:</Text>
                      <Text style={styles.developerDataValue}>{appVersion}</Text>
                    </View>
                    <View style={styles.developerDataRow}>
                      <Text style={styles.developerDataLabel}>{i18n.t('build')}:</Text>
                      <Text style={styles.developerDataValue}>{buildNumber}</Text>
                    </View>
                  </View>

                  {/* Basic Data */}
                  <View style={styles.developerPanelSection}>
                    <Text style={styles.developerPanelSectionTitle}>{i18n.t('streak_data_title')}</Text>
                    <View style={styles.developerDataRow}>
                      <Text style={styles.developerDataLabel}>{i18n.t('streak_count')}:</Text>
                      <Text style={styles.developerDataValue}>{userData.streakCount}</Text>
                    </View>
                    <View style={styles.developerDataRow}>
                      <Text style={styles.developerDataLabel}>{i18n.t('lamb_hearts')}:</Text>
                      <Text style={styles.developerDataValue}>{userData.lambHearts}</Text>
                    </View>
                    <View style={styles.developerDataRow}>
                      <Text style={styles.developerDataLabel}>{i18n.t('lamb_mood')}:</Text>
                      <Text style={styles.developerDataValue}>{userData.lambMood}</Text>
                    </View>
                  </View>

                  {/* Expandable Details Section */}
                  <TouchableOpacity
                    onPress={toggleDevPanelExpanded}
                    style={styles.developerPanelExpandButton}>
                    <Text style={styles.developerExpandText}>
                      {devPanelExpanded ? 'Hide Details' : 'Show Details'}
                    </Text>
                    <Feather
                      name={devPanelExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#3C584A"
                    />
                  </TouchableOpacity>

                  {/* Streak Data Section (Toggle Expanded) */}
                  {devPanelExpanded && (
                    <>
                      {/* Last Activity Dates */}
                      <View style={styles.developerPanelSection}>
                        <Text style={styles.developerPanelSectionTitle}>{i18n.t('last_activity_dates_title')}</Text>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('last_activity')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastActivityDate)}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('last_reading')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastReadingDate)}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('last_prayer')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastPrayerDate)}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('last_reflection')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastReflectionDate)}
                          </Text>
                        </View>
                      </View>

                      {/* Last Penalty Dates */}
                      <View style={styles.developerPanelSection}>
                        <Text style={styles.developerPanelSectionTitle}>{i18n.t('last_penalty_dates_title')}</Text>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('reading_penalty')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastReadingPenaltyDate)}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('prayer_penalty')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastPrayerPenaltyDate)}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>{i18n.t('reflection_penalty')}:</Text>
                          <Text style={styles.developerDataValue}>
                            {formatDate(userData.lastReflectionPenaltyDate)}
                          </Text>
                        </View>
                      </View>

                      {/* Streak Check Results */}
                      {streakData && (
                        <View style={styles.developerPanelSection}>
                          <Text style={styles.developerPanelSectionTitle}>
                            {i18n.t('last_streak_check_results_title')}
                          </Text>
                          <View style={styles.developerDataRow}>
                            <Text style={styles.developerDataLabel}>{i18n.t('streak_broken')}:</Text>
                            <Text style={styles.developerDataValue}>
                              {streakData.streakBroken ? i18n.t('yes') : i18n.t('no')}
                            </Text>
                          </View>
                          <View style={styles.developerDataRow}>
                            <Text style={styles.developerDataLabel}>{i18n.t('heart_penalty')}:</Text>
                            <Text style={styles.developerDataValue}>
                              {streakData.heartPenalty || 0}
                            </Text>
                          </View>
                          <View style={styles.developerDataRow}>
                            <Text style={styles.developerDataLabel}>{i18n.t('days_missed')}:</Text>
                            <Text style={styles.developerDataValue}>
                              {streakData.daysMissed || 0}
                            </Text>
                          </View>
                          <View style={styles.developerDataRow}>
                            <Text style={styles.developerDataLabel}>{i18n.t('new_day')}:</Text>
                            <Text style={styles.developerDataValue}>
                              {streakData.newDay ? i18n.t('yes') : i18n.t('no')}
                            </Text>
                          </View>
                          {streakData.error && (
                            <View style={styles.developerDataRow}>
                              <Text style={styles.developerDataLabel}>{i18n.t('error')}:</Text>
                              <Text style={[styles.developerDataValue, { color: 'red' }]}>
                                {String(streakData.error)}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}

                  {/* Force Streak Check Button */}
                  <TouchableOpacity
                    onPress={refreshStreakData}
                    style={styles.forceCheckButton}
                    disabled={devPanelLoading}>
                    <Text style={styles.forceCheckButtonText}>
                      {devPanelLoading ? i18n.t('checking') : i18n.t('force_streak_check')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Extra padding at bottom */}
              <View style={{ height: 40 }} />
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      ) : null}

      {/* Translation Selection Modal */}
      <Modal
        visible={translationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelTranslation}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('select_bible_translation_title')}</Text>

            <ScrollView style={styles.translationScrollView} showsVerticalScrollIndicator={false}>
              {translations.map((translation) => (
                <TouchableOpacity
                  key={translation.id}
                  style={[
                    styles.translationOption,
                    tempSelectedTranslation === translation.id && styles.selectedTranslation,
                  ]}
                  onPress={() => handleTempTranslationSelect(translation.id)}>
                  <Text
                    style={[
                      styles.translationOptionText,
                      tempSelectedTranslation === translation.id && styles.selectedTranslationText,
                    ]}>
                    {translation.name}
                  </Text>
                  {tempSelectedTranslation === translation.id && (
                    <Feather name="check" size={18} color="#F7B500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, tempSelectedTranslation === savedTranslation && styles.saveButtonDisabled]}
              onPress={handleSaveTranslation}
              disabled={isSavingTranslation || tempSelectedTranslation === savedTranslation}>
              <Text style={[styles.saveButtonText, tempSelectedTranslation === savedTranslation && styles.saveButtonTextDisabled]}>
                {isSavingTranslation ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTranslation}>
              <Text style={styles.cancelButtonText}>{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Referral Code Modal*/}
      <Modal
        visible={referralModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReferralModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              {i18n.t('enter_referral_code')}
            </Text>

            {/* Input Field */}
            <View className="mb-4">
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-lg font-din text-textPrimary border border-[#FFE4A8]"
                placeholder={i18n.t('enter_code_here')}
                placeholderTextColor="#B89B4C"
                value={referralInput || ''}
                onChangeText={setReferralInput}
                autoCapitalize="characters"
                maxLength={6}
                editable={!isSubmittingReferral}
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => handleReferralSubmit(referralInput)}
              className={`bg-[#FFE07D] rounded-xl p-4 mb-2 ${referralInput.length !== 6 ? 'opacity-50' : ''}`}
              disabled={referralInput.length !== 6 || isSubmittingReferral}>
              <Text className="font-feather text-textPrimary text-center text-lg">
                {isSubmittingReferral ? i18n.t('submitting') : i18n.t('confirm_button')}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setReferralModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reading Time Selection Modal */}
      <Modal
        visible={readingTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReadingTimeModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              {i18n.t('daily_reading_time_title')}
            </Text>

            {/* Options */}
            <View className="mb-4 space-y-3">
              {[
                { id: '1-5', title: i18n.t('reading_time_1_5') },
                { id: '6-10', title: i18n.t('reading_time_6_10') },
                { id: '15-25', title: i18n.t('reading_time_11_15') },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    setSelectedReadingTime(option.id);
                    handleReadingTimeSelection(option.id);
                  }}
                  className={`rounded-xl p-4 border-2 ${selectedReadingTime === option.id
                    ? 'bg-[#FFE07D] border-[#F7B500]'
                    : 'bg-white border-[#FFE4A8]'
                    }`}>
                  <Text
                    className={`font-feather text-center ${selectedReadingTime === option.id ? 'text-textPrimary' : 'text-textPrimary'
                      }`}>
                    {option.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setReadingTimeModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        visible={cancellationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellationModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              {i18n.t('why_are_you_cancelling')}
            </Text>

            {/* Options */}
            <View className="mb-4 space-y-3">
              {[
                i18n.t('too_expensive'),
                i18n.t('technical_issues'),
                i18n.t('missing_features'),
                i18n.t('missing_language'),
                i18n.t('missing_translation'),
                i18n.t('not_rewarding_enough'),
                i18n.t('bible_too_boring'),
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => toggleCancellationReason(reason)}
                  className={`rounded-xl p-4 border-2 ${cancellationReasons.includes(reason)
                    ? 'bg-[#FFE07D] border-[#F7B500]'
                    : 'bg-white border-[#FFE4A8]'
                    }`}>
                  <Text
                    className={`font-feather text-center ${cancellationReasons.includes(reason) ? 'text-textPrimary' : 'text-textPrimary'
                      }`}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Input */}
            <View className="mb-4">
              <Text className="font-din text-textPrimary mb-2">
                {i18n.t('please_elaborate')}
              </Text>
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-lg font-din text-textPrimary border border-[#FFE4A8] min-h-[120px]"
                placeholder={i18n.t('your_feedback_helps_us_improve')}
                placeholderTextColor="#B89B4C"
                value={cancellationFeedback}
                onChangeText={setCancellationFeedback}
                multiline
                numberOfLines={5}
                editable={!isSubmittingCancellation}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitCancellation}
              className={`bg-[#FFE07D] rounded-xl p-4 mb-2 ${cancellationReasons.length === 0 ? 'opacity-50' : ''}`}
              disabled={cancellationReasons.length === 0 || isSubmittingCancellation}>
              <Text className="font-feather text-textPrimary text-center text-lg">
                {isSubmittingCancellation ? i18n.t('submitting') : i18n.t('continue_button')}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setCancellationModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('select_language_title')}</Text>
            <ScrollView style={styles.translationScrollView} showsVerticalScrollIndicator={false}>
              {[
                { id: 'en', name: 'English' },
                { id: 'es', name: 'Español' },
                { id: 'pt', name: 'Português' },
                { id: 'nl', name: 'Nederlands' },
                { id: 'fr', name: 'Français' },
                { id: 'de', name: 'Deutsch' },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.translationOption,
                    selectedLanguage === lang.id && styles.selectedTranslation,
                  ]}
                  onPress={() => handleLanguageChange(lang.id)}>
                  <Text
                    style={[
                      styles.translationOptionText,
                      selectedLanguage === lang.id && styles.selectedTranslationText,
                    ]}>
                    {lang.name}
                  </Text>
                  {selectedLanguage === lang.id && (
                    <Feather name="check" size={18} color="#F7B500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.cancelButtonText}>{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  cancelButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.1)',
    borderRadius: 8,
    marginTop: 12,
    padding: 14,
  },
  cancelButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    padding: 5,
  },
  deleteAccountButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.2)',
    borderLeftColor: '#DF4533',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
  },
  deleteAccountText: {
    color: '#DF4533',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  developerDataLabel: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 12,
    opacity: 0.8,
  },
  developerDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  developerDataValue: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 12,
    fontWeight: '600',
  },
  developerExpandText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
  },
  developerPanel: {
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    marginBottom: 20,
    padding: 15,
  },
  developerPanelExpandButton: {
    alignItems: 'center',
    borderTopColor: 'rgba(60, 88, 74, 0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
  },
  developerPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  developerPanelSection: {
    borderBottomColor: 'rgba(60, 88, 74, 0.1)',
    borderBottomWidth: 1,
    marginBottom: 15,
    paddingBottom: 10,
  },
  developerPanelSectionTitle: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  developerPanelTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  developerToggleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderLeftColor: '#3C584A',
    borderLeftWidth: 4,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 20,
    padding: 12,
  },
  developerToggleText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
  },
  discordButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderLeftColor: '#5865F2',
    borderLeftWidth: 4,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  discordButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  discordButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginLeft: 10,
  },
  divider: {
    backgroundColor: '#FFE4A8',
    height: 1,
    marginVertical: 12,
  },
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  donePickingButton: {
    alignItems: 'center',
    backgroundColor: '#F7B500',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 8,
  },
  donePickingText: {
    color: '#FFFFFF',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  forceCheckButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderRadius: 8,
    marginTop: 10,
    padding: 10,
  },
  forceCheckButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF4D9',
    borderRadius: 16,
    maxHeight: '90%',
    maxWidth: 350,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 5,
  },
  roadmapButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftColor: '#22C55E',
    borderLeftWidth: 4,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 16,
  },
  roadmapButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  roadmapButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginLeft: 10,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#F7B500',
    borderRadius: 8,
    marginTop: 12,
    padding: 14,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(247, 181, 0, 0.3)',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedTranslation: {
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
  },
  selectedTranslationText: {
    color: '#3C584A',
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
    padding: 12,
  },
  settingsContentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
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
  timePicker: {
    height: 180,
    width: '100%',
  },
  timePickerContainer: {
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    borderColor: '#FFE4A8',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    overflow: 'hidden',
  },
  timePickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
  },
  timeSelector: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
  },
  timeSelectorActive: {
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderColor: '#F7B500',
  },
  timeSelectorText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  toggleButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    padding: 5,
    width: 50,
  },
  toggleButtonActive: {
    backgroundColor: '#F7B500',
  },
  toggleKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 20,
    transform: [{ translateX: 0 }],
    width: 20,
  },
  toggleKnobActive: {
    // Remove transform from here, we'll handle it with Animated
  },
  translationOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  translationOptionText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  translationScrollView: {
    maxHeight: 450,
  },
  translationSelector: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  translationText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
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
    marginRight: 10,
  },
});

export default SettingsSheet;
