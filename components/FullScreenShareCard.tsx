import React, { useRef, useEffect } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    View,
    TouchableOpacity,
    Text,
    StatusBar,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
import PrimaryButton from './PrimaryButton';
import i18n from '../app/utils/i18n';

interface FullScreenShareCardProps {
    visible: boolean;
    onClose: () => void;
    onShare: () => void;
    devotionalData: Devotional | null;
}

const FullScreenShareCard: React.FC<FullScreenShareCardProps> = ({
    visible,
    onClose,
    onShare,
    devotionalData,
}) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const contentScale = useRef(new Animated.Value(0.8)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
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
    }, [visible]);

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
                            source={{uri:devotionalData?.imageURL}}
                            className="h-full w-full"
                            style={{height:'100%'}}
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

                            {/* Top Left Close Button */}
                            <TouchableOpacity
                                className="absolute top-20 left-6 w-10 h-10 bg-black/30 rounded-full items-center justify-center z-10"
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
                                <Text className="font-feather text-white text-[22px] mb-2 font-bold">
                                    {devotionalData?.bibleReference}
                                </Text>
                                <Text className="font-din text-white text-[18px]  mb-7">
                                    {i18n.t('verse_of_the_day')}
                                </Text>
                                <Text className="font-din text-white text-[18px]  mb-10">
                                    {devotionalData?.verse}
                                </Text>
                            </Animated.View>

                            {/* Bottom Share Button */}
                            <View className="px-8 pb-12">
                                <PrimaryButton
                                    title={i18n.t('share')}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onShare();
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