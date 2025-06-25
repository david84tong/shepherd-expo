import React, { useRef, useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    View,
    TouchableOpacity,
    Text,
    StatusBar,
    Image,
    Platform,
} from 'react-native';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
import PrimaryButton from './PrimaryButton';
import i18n from '../app/utils/i18n';
import { RPH } from '~/app/helper/helper';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '~/app/stores/userStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { router } from 'expo-router';
import { BIBLE_BOOK_IDS } from '~/app/models/Path';

import analytics from '~/utils/analytics';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import { hapticLight } from '~/utils/haptics';

interface FullScreenShareCardProps {
    visible: boolean;
    onClose: () => void;
    devotionalData: Devotional | null;
    startShareFlow: boolean;
    setStartShareFlow: (value: boolean) => void;
}

const FullScreenShareCard: React.FC<FullScreenShareCardProps> = ({
    visible,
    onClose,
    devotionalData,
    startShareFlow,
    setStartShareFlow,
}) => {

    const pan = useRef(new Animated.ValueXY()).current;
    const contentScale = useRef(new Animated.Value(0.8)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const viewShotRef = useRef<ViewShot>(null);

    const currentUser = useUserStore.getState();

    // Get current devotional from store (for real-time updates)
    const currentDevotional = useDevotionalStore((state) => state.currentDevotional);
    const dailyDevotional = useDevotionalStore((state) => state.dailyDevotional);

    // Use store data if this devotional matches the current or daily devotional
    const storeDevotional = devotionalData && (
        currentDevotional?.id === devotionalData.id ? currentDevotional :
            dailyDevotional?.id === devotionalData.id ? dailyDevotional :
                devotionalData
    );

    const [isLiked, setIsLiked] = useState(false);
    const likeCount = storeDevotional?.likes || 0;
    const shareCount = storeDevotional?.shares || 0;
    const [isCapturing, setIsCapturing] = useState(false);

    const isRealDevotional = devotionalData ? !devotionalData.id.startsWith('quick-') && !devotionalData.id.startsWith('ai-') : false;
    useEffect(() => {
        if (startShareFlow) {
            handleSharePress();
        }

    }, [startShareFlow]);

    useEffect(() => {
        if (visible) {
            if (storeDevotional) {
                if (currentUser?.id && storeDevotional.likedBy && isRealDevotional) {
                    setIsLiked(storeDevotional.likedBy.includes(currentUser.id));
                }
            }

            Animated.parallel([
                Animated.spring(contentScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            contentScale.setValue(0.8);
            contentOpacity.setValue(0);
        }
    }, [visible, storeDevotional, currentUser, isRealDevotional]);

    const handleLikePress = async () => {
        if (!isRealDevotional || !currentUser?.id || !devotionalData?.id) return;

        hapticLight();
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);

        const devotionalRef = firestore().collection('dailyDevotionals').doc(devotionalData.id);

        try {
            await devotionalRef.update({
                likes: firestore.FieldValue.increment(newLikedState ? 1 : -1),
                likedBy: newLikedState
                    ? firestore.FieldValue.arrayUnion(currentUser.id)
                    : firestore.FieldValue.arrayRemove(currentUser.id),
            });
            analytics.logEvent('FullScreenShareCard_Like', {
                bibleReference: devotionalData.bibleReference,
                liked: newLikedState,
            });
            useDevotionalStore.getState().updateLikeStatus(devotionalData.id, newLikedState);
        } catch (error) {
            console.error("Error updating likes:", error);
            setIsLiked(!newLikedState);
        }
    };

    const handleSharePress = () => {
        if (!isRealDevotional || !devotionalData?.id) return;
        hapticLight();
        setIsCapturing(true);
        if (startShareFlow) {
            setStartShareFlow(false);
        }
    };

    const handleReadFullChapter = () => {
        if (!devotionalData?.bibleReference) return;

        hapticLight();

        // Parse the Bible reference to get book and chapter
        const parsedRef = parseBibleReference(devotionalData.bibleReference);
        if (!parsedRef) {
            console.error('Could not parse Bible reference:', devotionalData.bibleReference);
            return;
        }

        // Find the book ID from the parsed reference
        const bookId = BIBLE_BOOK_IDS[parsedRef.book];
        if (!bookId) {
            console.error('Could not find book ID for:', parsedRef.book);
            return;
        }

        // Navigate to Bible tab with the specific chapter
        router.replace({
            pathname: '/(tabs)/bible',
            params: {
                bookId: bookId.toString(),
                chapters: parsedRef.chapter.toString(),
                source: 'daily-verse',
                timestamp: Date.now().toString(),
            },
        });

        // Close the modal
        onClose();

        // Log analytics
        analytics.logEvent('FullScreenShareCard_ReadFullChapter', {
            bibleReference: devotionalData.bibleReference,
            bookId: bookId,
            chapter: parsedRef.chapter,
        });
    };

    // Helper function to parse Bible reference like "Jeremiah 29:13" or "1 John 3:16"
    const parseBibleReference = (reference: string): { book: string; chapter: number } | null => {
        try {
            // Updated regex to correctly capture book and chapter from various formats
            const match = reference.match(/^(.*?)\s*(\d+):\d+.*$/);
            if (match) {
                const book = match[1].trim();
                const chapter = parseInt(match[2], 10);
                return { book, chapter };
            }

            return null;
        } catch (error) {
            console.error('Error parsing Bible reference:', reference, error);
            return null;
        }
    };


    useEffect(() => {
        if (isCapturing) {
            const captureAndShare = async () => {
                if (!viewShotRef.current) {
                    setIsCapturing(false);
                    return;
                }
                try {
                    // Wait for 1 second before capturing to ensure animations complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const screenshotUri = await viewShotRef.current?.capture?.();
                    if (screenshotUri && devotionalData) {
                        const appStoreLink = Platform.OS === 'ios'
                            ? 'https://apps.apple.com/us/app/shepherd-spiritual-bible-pet/id6745461941'
                            : 'https://play.google.com/store/apps/details?id=second.round.shepherd';
                        const message = `"${devotionalData.verse}" - ${devotionalData.bibleReference}\n\nDownload Shepherd: ${appStoreLink}`;

                        try {
                            const shareOptions = {
                                title: 'Share Daily Verse',
                                message: message,
                                url: screenshotUri,
                                type: 'image/jpeg',
                                subject: 'Daily Verse from Shepherd',
                            };

                            const shareResult = await Share.open(shareOptions);
                            console.log('Share successful:', shareResult);

                            // Update share count and analytics
                            const devotionalRef = firestore().collection('dailyDevotionals').doc(devotionalData.id);
                            await devotionalRef.update({
                                shares: firestore.FieldValue.increment(1),
                            });
                            analytics.logEvent('FullScreenShareCard_Share', {
                                bibleReference: devotionalData.bibleReference,
                                platform: Platform.OS,
                            });
                            useDevotionalStore.getState().incrementShareCount(devotionalData.id);
                        } catch (shareError) {
                            console.log('Share cancelled or failed:', shareError);
                            // Don't update share count if user cancelled
                        }

                        setIsCapturing(false);
                    }
                } catch (error) {
                    console.error("Error sharing:", error);
                }
            };

            setTimeout(captureAndShare, 100);
        }
    }, [isCapturing, devotionalData]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    pan.y.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    Animated.timing(pan.y, {
                        toValue: Dimensions.get('window').height,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                        pan.y.setValue(0);
                    });
                } else {
                    Animated.spring(pan.y, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Add PanResponder for bottom close area (swipe up)
    const bottomPan = useRef(new Animated.Value(0)).current;
    const bottomPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy < 0) {
                    bottomPan.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -40) { // Swiped up enough
                    onClose();
                    bottomPan.setValue(0);
                } else {
                    Animated.spring(bottomPan, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    return (
        <>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle={'light-content'}
                hidden={visible}
            />

            <Modal
                visible={visible}
                transparent={false}
                animationType="fade"
                onRequestClose={onClose}
                statusBarTranslucent={true}
            >
                <Animated.View
                    className="flex-1 bg-black/50"
                    style={{
                        transform: [{ translateY: pan.y }],
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: Dimensions.get('window').width,
                        height: Dimensions.get('window').height,
                    }}
                    {...panResponder.panHandlers}
                >
                    <ViewShot
                        ref={viewShotRef}
                        options={{
                            format: 'jpg',
                            quality: 0.9,
                            result: Platform.OS === 'android' ? 'tmpfile' : 'data-uri'
                        }}
                        style={{
                            flex: 1,
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <View className="flex-1 bg-[#AAB33D]" style={{
                            overflow: 'hidden',
                            width: '100%',
                            height: '100%',
                        }}>
                            <ImageBackground
                                source={{ uri: devotionalData?.imageURL }}
                                className="h-full w-full"
                                style={{
                                    height: '100%',
                                    width: '100%',
                                }}
                                contentFit="cover"
                            >
                                {/* Linear gradient overlay for readability - darker at top, lighter at bottom */}
                                <LinearGradient
                                    colors={['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.1)']}
                                    locations={[0, 0.6, 1]}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                    }}
                                />

                                {/* Top Right Close Button */}
                                <TouchableOpacity
                                    style={{
                                        top: RPH(8),
                                        opacity: isCapturing ? 0 : 1
                                    }}
                                    className="absolute right-6 w-10 h-10 bg-black/30 rounded-full items-center justify-center z-10"
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                >
                                    <FontAwesome name="times" size={20} color="white" />
                                </TouchableOpacity>

                                {/* Content */}
                                <Animated.View
                                    className="flex-1 justify-center px-8"
                                    style={{
                                        transform: [{ scale: contentScale }],
                                        opacity: contentOpacity,
                                    }}
                                >
                                    <Text className="font-feather text-white text-[24px] mb-2 font-bold">
                                        {devotionalData?.bibleReference}
                                    </Text>
                                    <Text className="font-nunito-mediumItalic text-white text-[20px]  mb-7">
                                        {i18n.t('verse_of_the_day')}
                                    </Text>
                                    <Text className="font-din text-white text-[24px]  mb-10">
                                        {devotionalData?.verse}
                                    </Text>

                                    <View style={{ opacity: isCapturing ? 0 : 1 }} className="flex-row items-center mt-4">
                                        <TouchableOpacity onPress={handleLikePress} disabled={!isRealDevotional} className="flex-row items-center mr-4">
                                            <Ionicons name="heart" size={RPH(2.2)} color={isLiked && isRealDevotional ? "#B36303" : "white"} />
                                            <Text className="ml-2 text-white font-din text-lg">{likeCount}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleSharePress} disabled={!isRealDevotional || isCapturing} className="flex-row items-center">
                                            <FontAwesome5 name="share-alt" size={RPH(1.8)} color="white" />
                                            <Text className="ml-2 text-white font-din text-lg">{shareCount}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>

                                {/* Bottom Read Full Chapter Button */}
                                <View style={{ opacity: isCapturing ? 0 : 1 }} className="px-8 pb-12">
                                    <PrimaryButton
                                        title={i18n.t('read_full_chapter') || "Read Full Chapter"}
                                        onPress={handleReadFullChapter}
                                        buttonType="orange"
                                        disabled={isCapturing}
                                    />
                                </View>

                                {/* Shepherd Branding - Only visible when capturing */}
                                {isCapturing && (
                                    <View className="absolute bottom-0 left-0 right-0">

                                        <View className="flex-row items-center justify-center py-6 px-8">
                                            <View className="p-2 mr-2">
                                                <Image
                                                    source={require('../assets/icon.png')}
                                                    className="w-8 h-8"
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <View>
                                                <Text className="font-feather text-white text-xl font-bold tracking-wide">
                                                    Shepherd
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ImageBackground>
                        </View>
                    </ViewShot>
                </Animated.View>
            </Modal>
        </>
    );
};

export default FullScreenShareCard; 