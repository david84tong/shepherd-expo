import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

const CARD_OFFSET = 25; // px offset for both right and bottom - increased to prevent overlap

interface CardStackProps<T> {
    data: T[];
    renderCard: (item: T, index: number, onCardTap: () => void) => React.ReactNode;
    style?: any; // Pass { width: number } to override default width (320)
    dynamicHeight?: boolean; // New prop to enable dynamic height calculation
    baseHeight?: number; // Base height in pixels when dynamicHeight is true
}

function CardStack<T>({ data, renderCard, style, dynamicHeight = false, baseHeight = 350 }: CardStackProps<T>) {
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
        Array.from({ length: stackSize }, (_, i) => new Animated.Value(i === stackSize - 1 ? -20 : 0)) // Reduced to -20 to prevent overlap
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

    // Calculate dynamic height based on content length
    const calculateDynamicHeight = useCallback(() => {
        if (!dynamicHeight) return baseHeight;
        
        // Calculate height for all cards in the stack to find the maximum needed height
        let maxHeight = baseHeight;
        
        cardsToShow.forEach((cardInfo) => {
            const devotional = cardInfo.item as any;
            if (!devotional) return;
            
            let cardHeight = baseHeight;
            
            if (devotional.verse) {
                const verseLength = devotional.verse.length;
                const lineBreaks = (devotional.verse.match(/\n/g) || []).length;
                
                // Calculate height based on both character length and line breaks
                let verseHeight = 0;
                
                // Balanced height calculation for verse content
                if (verseLength > 400) {
                    verseHeight += 100; // Add 100px for very long verses
                } else if (verseLength > 300) {
                    verseHeight += 85; // Add 85px for very long verses
                } else if (verseLength > 200) {
                    verseHeight += 70; // Add 70px for long verses
                } else if (verseLength > 100) {
                    verseHeight += 2; // Add 50px for medium verses
                } else if (verseLength > 50) {
                    verseHeight += 1; // Add 35px for short verses
                }
                
                // Add extra height for line breaks and estimated text wrapping
                verseHeight += lineBreaks * 15;
                
                // Estimate additional height for text wrapping (assuming ~40 characters per line)
                const estimatedLines = Math.ceil(verseLength / 40);
                const extraLineHeight = Math.max(0, estimatedLines - 1) * 8; // 8px per additional line
                verseHeight += extraLineHeight;
                
                cardHeight += verseHeight;
            }
            
            // Add extra height for longer Bible references
            if (devotional.bibleReference) {
                const referenceLength = devotional.bibleReference.length;
                if (referenceLength > 30) {
                    cardHeight += 15; // Add 15px for very long references
                } else if (referenceLength > 20) {
                    cardHeight += 12; // Add 12px for long references
                }
            }
            
            // Add extra height for custom devotionals that might have additional content
            if (devotional.id && (devotional.id.startsWith('custom-') || devotional.id.startsWith('ai-'))) {
                cardHeight += 25; // Add 25px for custom devotionals
            }
            
            // Add extra height for cards with share/expand buttons
            if (devotional.id) {
                cardHeight += 20; // Add 20px for button area
            }
            
            // Update max height if this card needs more space
            maxHeight = Math.max(maxHeight, cardHeight);
        });
        
        // Add extra height for stack overlap effect
        if (stackSize > 1) {
            maxHeight += 15; // Extra height for stack effect
        }
        
        // Ensure minimum height and add buffer for safety
        const finalHeight = Math.max(maxHeight, baseHeight) + 15; // Buffer to prevent overflow
        
        // Debug logging for height calculation
        if (__DEV__) {
            console.log('🎨 [CardStack] Dynamic height calculation:', {
                cardsCount: cardsToShow.length,
                stackSize,
                baseHeight,
                maxHeight,
                finalHeight,
                verseLengths: cardsToShow.map(card => (card.item as any)?.verse?.length || 0)
            });
        }
        
        return finalHeight;
    }, [cardsToShow, dynamicHeight, baseHeight, stackSize]);

    const containerHeight = calculateDynamicHeight();

    // Note: Height is now calculated based on all cards in the stack, not just the current one
    // This prevents height fluctuation during swipes

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
                toValue: -20, // Changed to -20 to match initial value
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
                    toValue: newIsBack ? -20 : 0, // Changed to -20 to match initial value
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
                translation.setValue(index === stackSize - 1 ? -20 : 0); // Changed to -20 to match initial value
            });
            setIsAnimating(false);
        });
    }, [isAnimating, cardPositions, cardZIndices, position, data.length, stackSize]);

    // Handle tap on any card to bring it to front or cycle to next
    const handleCardTap = useCallback((cardIndex: number) => {
        if (isAnimating) return;

        // If it's the front card (index 0), trigger the same animation as swipe
        if (cardIndex === 0) {
            handleSwipe();
            return;
        }

        // For back cards, bring them to front using the same smooth animation style
        setIsAnimating(true);

        // Calculate the new order after bringing the tapped card to front
        const newOrder = [];
        newOrder.push(cardIndex); // Tapped card goes to front
        for (let i = 0; i < stackSize; i++) {
            if (i !== cardIndex) {
                newOrder.push(i);
            }
        }

        const animations = [];

        // Animate all cards to their new positions using the same smooth style as handleSwipe
        for (let i = 0; i < stackSize; i++) {
            const currentCardIndex = newOrder[i];
            const newPosition = i * CARD_OFFSET;
            const newZIndex = stackSize - i;
            const newIsBack = i === stackSize - 1;

            // Move card to new position
            animations.push(
                Animated.timing(cardPositions[currentCardIndex], {
                    toValue: newPosition,
                    duration: 300,
                    useNativeDriver: false,
                })
            );

            // Update z-index
            animations.push(
                Animated.timing(cardZIndices[currentCardIndex], {
                    toValue: newZIndex,
                    duration: 300,
                    useNativeDriver: false,
                })
            );

            // Animate rotation
            animations.push(
                Animated.timing(cardRotations[currentCardIndex], {
                    toValue: newIsBack ? 1 : 0,
                    duration: 300,
                    useNativeDriver: false,
                })
            );

            // Animate translation
            animations.push(
                Animated.timing(cardTranslations[currentCardIndex], {
                    toValue: newIsBack ? -20 : 0,
                    duration: 300,
                    useNativeDriver: false,
                })
            );
        }

        Animated.parallel(animations).start(() => {
            // Update the current index to reflect the new front card
            const newDataIndex = cardsToShow[cardIndex].dataIndex;
            setCurrentIndex(newDataIndex);

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
                translation.setValue(index === stackSize - 1 ? -20 : 0);
            });

            setIsAnimating(false);
        });
    }, [isAnimating, cardPositions, cardZIndices, cardRotations, cardTranslations, data.length, stackSize, handleSwipe, cardsToShow]);

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
    const cardWidth = containerWidth - maxOffset; // Each card is slightly smaller to account for offset

    return (
        <View
            style={[
                { 
                    width: containerWidth, 
                    height: containerHeight, 
                    position: 'relative', 
                    alignItems: 'center', 
                    marginTop: 20
                }, 
                style
            ]}
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
                                    outputRange: ['0deg', '5deg'], // Reduced rotation for cleaner look
                                })
                            },
                            {
                                translateY: cardTranslations[i].interpolate({
                                    inputRange: [-20, 0],
                                    outputRange: [-20, 0], // Updated to match new translation values
                                })
                            },
                        ],
                    },
                ];

                return (
                    <Animated.View
                        key={`card-${cardInfo.dataIndex}`}
                        style={cardStyle}
                        pointerEvents="box-none"
                        {...(isTop && !isAnimating ? panResponder.panHandlers : {})}
                    >
                        <View style={{ flex: 1 }} pointerEvents="box-none">
                            {renderCard(cardInfo.item, cardInfo.dataIndex, () => handleCardTap(i))}
                        </View>
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