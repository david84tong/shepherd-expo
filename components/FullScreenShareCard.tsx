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
import * as Haptics from 'expo-haptics';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
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
                                    Verse of the day
                                </Text>
                                <Text className="font-din text-white text-[18px]  mb-10">
                                    {devotionalData?.verse}
                                </Text>
                                {/* Share Button */}
                                <View className="w-full items-center ">
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onShare();
                                        }}
                                        className="w-full rounded-full bg-[#4FB8FE] border-[#06B6FE] border-[3px] items-center justify-center"
                                        style={{ height: 56 }}
                                    >
                                        <Text className="font-feather text-white text-[20px] font-bold text-center">
                                            Share
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Bottom Close Area */}
                            <TouchableOpacity
                                className="items-center mb-8"
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <FontAwesome name="angle-double-up" size={32} color="white" />
                                <Text className="font-feather text-white mt-2 text-[18px]">Close</Text>
                            </TouchableOpacity>
                        </ImageBackground>
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
};

export default FullScreenShareCard; 