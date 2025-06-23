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
    Share,
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
import * as FileSystem from 'expo-file-system';
import analytics from '~/utils/analytics';

interface FullScreenShareCardProps {
    visible: boolean;
    onClose: () => void;
    devotionalData: Devotional | null;
}

const FullScreenShareCard: React.FC<FullScreenShareCardProps> = ({
    visible,
    onClose,
    devotionalData,
}) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const contentScale = useRef(new Animated.Value(0.8)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;

    const currentUser = useUserStore.getState();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(devotionalData?.likes || 0);
    const [shareCount, setShareCount] = useState(devotionalData?.shares || 0);

    const isRealDevotional = devotionalData ? !devotionalData.id.startsWith('quick-') && !devotionalData.id.startsWith('ai-') : false;

    useEffect(() => {
        if (visible) {
            if (devotionalData) {
                setLikeCount(devotionalData.likes || 0);
                setShareCount(devotionalData.shares || 0);
                if (currentUser?.id && devotionalData.likedBy && isRealDevotional) {
                    setIsLiked(devotionalData.likedBy.includes(currentUser.id));
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
    }, [visible, devotionalData, currentUser, isRealDevotional]);

    const handleLikePress = async () => {
        if (!isRealDevotional || !currentUser?.id || !devotionalData?.id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

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
            setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
        }
    };

    const handleSharePress = async () => {
        if (!isRealDevotional || !devotionalData?.id || !devotionalData?.imageURL) return;

        try {
            const localUri = FileSystem.cacheDirectory + 'share_image.jpg';
            await FileSystem.downloadAsync(devotionalData.imageURL, localUri);

            const message = `"${devotionalData.verse}" - ${devotionalData.bibleReference}`;

            const result = await Share.share({
                title: 'Share Daily Verse',
                message: Platform.OS === 'android' ? `${message}\n${localUri}` : message,
                url: localUri,
            });

            setShareCount(prev => prev + 1);
            const devotionalRef = firestore().collection('dailyDevotionals').doc(devotionalData.id);
            await devotionalRef.update({
                shares: firestore.FieldValue.increment(1),
            });
            analytics.logEvent('FullScreenShareCard_Share', {
                bibleReference: devotionalData.bibleReference,
            });
            useDevotionalStore.getState().incrementShareCount(devotionalData.id);
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

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
            />

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <Animated.View
                    className="flex-1 bg-black/50"
                    style={{ transform: [{ translateY: pan.y }] }}
                    {...panResponder.panHandlers}
                >
                    <View className="flex-1 bg-[#AAB33D]" style={{ overflow: 'hidden' }}>
                        <ImageBackground
                            source={{ uri: devotionalData?.imageURL }}
                            className="h-full w-full"
                            style={{ height: '100%' }}
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
                                    top: RPH(8)
                                }}
                                className="absolute  right-6 w-10 h-10 bg-black/30 rounded-full items-center justify-center z-10"
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

                                <View className="flex-row items-center mt-4">
                                    <TouchableOpacity onPress={handleLikePress} disabled={!isRealDevotional} className="flex-row items-center mr-4">
                                        <Ionicons name="heart" size={RPH(2.2)} color={isLiked && isRealDevotional ? "#B36303" : "white"} />
                                        <Text className="ml-2 text-white font-din text-lg">{likeCount}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSharePress} disabled={!isRealDevotional} className="flex-row items-center">
                                        <FontAwesome5 name="share-alt" size={RPH(1.8)} color="white" />
                                        <Text className="ml-2 text-white font-din text-lg">{shareCount}</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Bottom Share Button */}
                            <View className="px-8 pb-12">
                                <PrimaryButton
                                    title={i18n.t('share')}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        handleSharePress();
                                    }}
                                    buttonType="orange"
                                />
                            </View>
                        </ImageBackground>
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
};

export default FullScreenShareCard; 