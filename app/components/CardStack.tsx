import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

const CARD_OFFSET = 16; // px offset for both right and bottom

interface CardStackProps<T> {
    data: T[];
    renderCard: (item: T, index: number, onCardTap: () => void) => React.ReactNode;
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

    // Create animated values for back card rotation and translation
    const cardRotations = useRef(
        Array.from({ length: stackSize }, (_, i) => new Animated.Value(i === stackSize - 1 ? 1 : 0))
    ).current;

    const cardTranslations = useRef(
        Array.from({ length: stackSize }, (_, i) => new Animated.Value(i === stackSize - 1 ? -50 : 0))
    ).current;

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

        // Smoothly animate rotation to back card style
        animations.push(
            Animated.timing(cardRotations[0], {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Smoothly animate translation to back card style
        animations.push(
            Animated.timing(cardTranslations[0], {
                toValue: -50,
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

            // Smoothly animate rotation for cards moving to new positions
            const newIsBack = (i - 1) === stackSize - 1;
            animations.push(
                Animated.timing(cardRotations[i], {
                    toValue: newIsBack ? 1 : 0,
                    duration: 300,
                    useNativeDriver: false,
                })
            );

            // Smoothly animate translation for cards moving to new positions
            animations.push(
                Animated.timing(cardTranslations[i], {
                    toValue: newIsBack ? -50 : 0,
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

            // Reset rotation and translation values
            cardRotations.forEach((rotation, index) => {
                rotation.setValue(index === stackSize - 1 ? 1 : 0);
            });
            cardTranslations.forEach((translation, index) => {
                translation.setValue(index === stackSize - 1 ? -50 : 0);
            });
            setIsAnimating(false);
        });
    }, [isAnimating, cardPositions, cardZIndices, position, data.length, stackSize]);

    // Handle tap on front card to trigger swipe animation
    const handleCardTap = useCallback((cardIndex: number) => {
        if (isAnimating) return;

        // If it's the front card (index 0), trigger the same animation as swipe
        if (cardIndex === 0) {
            handleSwipe();
            return;
        }

        // For back cards, bring them to front (original functionality)
        setIsAnimating(true);

        // Animate the tapped card to the front
        const animations = [];

        // Move tapped card to front position
        animations.push(
            Animated.timing(cardPositions[cardIndex], {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Set tapped card to highest z-index
        animations.push(
            Animated.timing(cardZIndices[cardIndex], {
                toValue: stackSize,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Smoothly animate rotation for tapped card (remove back card styling)
        animations.push(
            Animated.timing(cardRotations[cardIndex], {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Smoothly animate translation for tapped card (remove back card styling)
        animations.push(
            Animated.timing(cardTranslations[cardIndex], {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            })
        );

        // Move other cards back one position
        for (let i = 0; i < stackSize; i++) {
            if (i !== cardIndex) {
                const newPosition = i < cardIndex ? i + 1 : i;
                animations.push(
                    Animated.timing(cardPositions[i], {
                        toValue: newPosition * CARD_OFFSET,
                        duration: 300,
                        useNativeDriver: false,
                    })
                );

                // Adjust z-index for other cards
                const newZIndex = i < cardIndex ? stackSize - (i + 1) : stackSize - i;
                animations.push(
                    Animated.timing(cardZIndices[i], {
                        toValue: newZIndex,
                        duration: 300,
                        useNativeDriver: false,
                    })
                );

                // Smoothly animate rotation for cards moving to new positions
                const newIsBack = newPosition === stackSize - 1;
                animations.push(
                    Animated.timing(cardRotations[i], {
                        toValue: newIsBack ? 1 : 0,
                        duration: 300,
                        useNativeDriver: false,
                    })
                );

                // Smoothly animate translation for cards moving to new positions
                animations.push(
                    Animated.timing(cardTranslations[i], {
                        toValue: newIsBack ? -50 : 0,
                        duration: 300,
                        useNativeDriver: false,
                    })
                );
            }
        }

        Animated.parallel(animations).start(() => {
            // Reset positions and z-indices
            cardPositions.forEach((pos, index) => {
                pos.setValue(index * CARD_OFFSET);
            });
            cardZIndices.forEach((zIndex, index) => {
                zIndex.setValue(stackSize - index);
            });

            // Reset rotation and translation values
            cardRotations.forEach((rotation, index) => {
                rotation.setValue(index === stackSize - 1 ? 1 : 0);
            });
            cardTranslations.forEach((translation, index) => {
                translation.setValue(index === stackSize - 1 ? -50 : 0);
            });

            setIsAnimating(false);
        });
    }, [isAnimating, cardPositions, cardZIndices, data.length, stackSize, handleSwipe]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (_, gesture) => {
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

    // Calculate card width properly for React Native (no CSS calc)
    const cardWidth = containerWidth - (maxOffset * 0.1); // Reduced offset for more width

    return (
        <View
            style={[{ width: containerWidth, minHeight: 320, position: 'relative', alignItems: 'center', marginTop: 25 }, style]}
            pointerEvents="box-none"
            onTouchStart={() => {
                // Mark gesture as potentially active immediately
                gestureActiveRef.current = true;
            }}
        >
            {cardsToShow.map((cardInfo, i) => {
                const isTop = i === 0;
                const isBack = i === stackSize - 1;
                const cardStyle = [
                    styles.card,
                    {
                        position: 'absolute',
                        left: cardPositions[i],
                        top: cardPositions[i],
                        zIndex: cardZIndices[i],
                        width: cardWidth,
                    },
                    {
                        transform: [
                            ...(isTop ? [
                                { translateX: position },
                                { rotate: rotate },
                                { scale: scale },
                            ] : []),
                            {
                                rotateZ: cardRotations[i].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '4deg'],
                                })
                            },
                            { translateY: cardTranslations[i] },
                        ],
                    },
                ];

                return (
                    <Animated.View
                        key={`card-${cardInfo.dataIndex}`}
                        style={cardStyle}
                        {...(isTop && !isAnimating ? panResponder.panHandlers : {})}
                    >
                        {renderCard(cardInfo.item, cardInfo.dataIndex, () => handleCardTap(i))}
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