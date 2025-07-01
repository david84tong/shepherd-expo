import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

const CARD_OFFSET = 16; // px offset for both right and bottom

interface CardStackProps<T> {
    data: T[];
    renderCard: (item: T, index: number) => React.ReactNode;
    style?: any; // Pass { width: number } to override default width (320)
}

function CardStack<T>({ data, renderCard, style }: CardStackProps<T>) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const position = useRef(new Animated.Value(0)).current; // Only X
    const [isAnimating, setIsAnimating] = useState(false);
    const gestureActiveRef = useRef(false);

    // Dynamic stack size based on data length, max 3 cards
    const stackSize = Math.min(data.length, 3);
    const maxOffset = (stackSize - 1) * CARD_OFFSET;

    // Create animated values for each card's position
    const cardPositions = useRef(
        Array.from({ length: stackSize }, (_, i) => new Animated.Value(i * CARD_OFFSET))
    ).current;

    // Create animated values for z-index
    const cardZIndices = useRef(
        Array.from({ length: stackSize }, (_, i) => new Animated.Value(stackSize - i))
    ).current;

    // Create stable keys for each card position
    const cardKeys = useMemo(() => {
        return Array.from({ length: stackSize }, (_, i) => `card-${i}`);
    }, [stackSize]);

    console.log('🎴 CardStack render:', {
        dataLength: data.length,
        stackSize,
        maxOffset,
        cardKeys: cardKeys.length
    });

    // Get the current cards to display based on currentIndex
    const cardsToShow = useMemo(() => {
        const cards = [];
        for (let i = 0; i < stackSize; i++) {
            const dataIndex = (currentIndex + i) % data.length;
            cards.push({
                item: data[dataIndex],
                dataIndex: dataIndex,
                displayIndex: i
            });
        }
        return cards;
    }, [currentIndex, data, stackSize]);

    // Interpolate rotation for swipe left and right
    const rotate = position.interpolate({
        inputRange: [-200, 0, 200],
        outputRange: ['-15deg', '0deg', '15deg'],
        extrapolate: 'clamp',
    });

    // Interpolate scale for the top card
    const scale = position.interpolate({
        inputRange: [-200, 0, 200],
        outputRange: [0.95, 1, 0.95],
        extrapolate: 'clamp',
    });

    const handleSwipe = useCallback(() => {
        if (isAnimating) return;

        setIsAnimating(true);

        // Animate the top card to the back position smoothly
        const animations = [];

        // Smoothly reset position and rotation
        animations.push(
            Animated.timing(position, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Move top card to back position
        animations.push(
            Animated.timing(cardPositions[0], {
                toValue: (stackSize - 1) * CARD_OFFSET,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Smoothly change z-index to back
        animations.push(
            Animated.timing(cardZIndices[0], {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Move other cards up one position
        for (let i = 1; i < stackSize; i++) {
            animations.push(
                Animated.timing(cardPositions[i], {
                    toValue: (i - 1) * CARD_OFFSET,
                    duration: 300,
                    useNativeDriver: false,
                })
            );

            // Smoothly increase z-index of other cards
            animations.push(
                Animated.timing(cardZIndices[i], {
                    toValue: stackSize - (i - 1),
                    duration: 300,
                    useNativeDriver: false,
                })
            );
        }

        Animated.parallel(animations).start(() => {
            // Update the current index to move to next card
            setCurrentIndex(prev => (prev + 1) % data.length);

            // Reset positions and z-indices
            cardPositions.forEach((pos, index) => {
                pos.setValue(index * CARD_OFFSET);
            });
            cardZIndices.forEach((zIndex, index) => {
                zIndex.setValue(stackSize - index);
            });

            setIsAnimating(false);
        });
    }, [isAnimating, cardPositions, cardZIndices, position, data.length, stackSize]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (_, gesture) => {
                console.log("RENDERING");

                // Be more aggressive about claiming horizontal gestures
                return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 3;
            },
            onMoveShouldSetPanResponder: (_, gesture) => {
                // Handle horizontal gestures with lower threshold and not during animation
                return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 5 && !isAnimating;
            },
            onPanResponderGrant: () => {
                // Always claim the gesture to prevent BottomSheet interference
                gestureActiveRef.current = true;
                return true;
            },
            onPanResponderMove: (_, gesture) => {
                // Only handle horizontal movement
                if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
                    position.setValue(gesture.dx);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                gestureActiveRef.current = false;
                if (gesture.dx > 100 || gesture.dx < -100) {
                    handleSwipe();
                } else {
                    // Spring back to center
                    Animated.spring(position, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                // Spring back to center if gesture is terminated
                gestureActiveRef.current = false;
                Animated.spring(position, {
                    toValue: 0,
                    useNativeDriver: false,
                }).start();
            },
        })
    ).current;

    // Default width for the stack if not overridden
    const containerWidth = style && style.width ? style.width : 320;

    return (
        <View
            style={[{ width: containerWidth, height: 320, position: 'relative', alignItems: 'center', marginTop: 25 }, style]}
            pointerEvents="box-none"
            onTouchStart={() => {
                // Mark gesture as potentially active immediately
                gestureActiveRef.current = true;
            }}
        >
            {cardsToShow.map((cardInfo, i) => {
                const isTop = i === 0;
                const cardStyle = [
                    styles.card,
                    {
                        position: 'absolute',
                        left: cardPositions[i],
                        top: cardPositions[i],
                        zIndex: cardZIndices[i],
                        width: `calc(100% - ${2 * maxOffset}px)` as any,
                    },
                    isTop && {
                        transform: [
                            { translateX: position },
                            { rotate: rotate },
                            { scale: scale },
                        ],
                    },
                ];
                return (
                    <Animated.View
                        key={cardKeys[i]}
                        style={cardStyle}
                        {...(isTop && !isAnimating ? panResponder.panHandlers : {})}
                    >
                        {renderCard(cardInfo.item, cardInfo.dataIndex)}
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        // Optionally add shadow or borderRadius here for better stack effect
    },
});

export default CardStack; 