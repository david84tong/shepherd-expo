import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import analytics from '~/utils/analytics';
import PrimaryButton from '~/components/PrimaryButton';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
import { RPH } from '~/app/helper/helper';
import { AppFonts } from '~/app/constants/appFonts';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '~/app/stores/userStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { hapticLight } from '~/utils/haptics';
import dayjs from 'dayjs';

interface SavedDevotionalCardProps {
    devotional: Devotional & { likedBy?: string[] };
    onStartDevotional: () => void;
    onRefresh: () => void;
}

const SavedDevotionalCard: React.FC<SavedDevotionalCardProps> = ({
    devotional,
    onStartDevotional,
    onRefresh,
}) => {
    const currentUser = useUserStore.getState();
    const { updateLikeStatus, incrementShareCount } = useDevotionalStore();

    const [isLiked, setIsLiked] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const likeCount = devotional.likes || 0;
    const shareCount = devotional.shares || 0;

    // Check if current devotional is liked by user
    useEffect(() => {
        if (currentUser?.id && devotional.likedBy) {
            setIsLiked(devotional.likedBy.includes(currentUser.id));
        }
    }, [devotional, currentUser]);

    const handleLikePress = async () => {
        if (!currentUser?.id || !devotional?.id) return;

        hapticLight();

        try {
            // Remove devotional from savedDevotionals collection
            const savedDevotionalId = `${currentUser.id}_${devotional.id}`;

            console.log('🔍 Removing devotional from savedDevotionals:', {
                id: savedDevotionalId,
                devotionalId: devotional.id,
                userId: currentUser.id
            });

            // Delete from savedDevotionals collection
            await firestore().collection('savedDevotionals').doc(savedDevotionalId).delete();

            // Log analytics
            analytics.logEvent('SavedDevotionalCard_UnsaveDevotional', {
                devotionalId: devotional.id,
                bibleReference: devotional.bibleReference,
            });

            // Refresh the list
            onRefresh();
        } catch (error) {
            console.error("Error removing saved devotional:", error);
        }
    };

    const handleSharePress = async () => {
        hapticLight();
        setIsShared(true);

        try {
            // Only update Firestore if we have a devotional with an ID
            if (devotional?.id) {
                console.log('🔍 Updating Firestore share count for devotional:', devotional.id);

                // Determine which collection to update based on devotional type
                const isCustomDevotional = devotional.id.startsWith('ai-') || devotional.id.startsWith('quick-');
                const collectionName = isCustomDevotional ? 'customDevotionals' : 'dailyDevotionals';

                // Update Firestore share count
                const devotionalRef = firestore().collection(collectionName).doc(devotional.id);
                await devotionalRef.update({
                    shares: firestore.FieldValue.increment(1),
                });

                // Update local store
                incrementShareCount(devotional.id);

                // Log analytics
                analytics.logEvent('SavedDevotionalCard_Share', {
                    devotionalId: devotional.id,
                    bibleReference: devotional.bibleReference,
                    devotionalType: isCustomDevotional ? 'custom' : 'daily',
                });
            }
        } catch (error) {
            console.error("Error updating share:", error);
            setIsShared(false); // Revert on error
        }
    };

    const handleStartDevotional = () => {
        hapticLight();
        analytics.logEvent('SavedDevotionalCard_StartDevotional', {
            devotionalId: devotional.id,
            bibleReference: devotional.bibleReference,
        });
        onStartDevotional();
    };

    // Format the creation date
    const formatDate = (dateString: string) => {
        try {
            return dayjs(dateString).format('MMM D, YYYY');
        } catch (error) {
            return 'Unknown date';
        }
    };

    if (!devotional?.verse) {
        return null;
    }

    return (
        <Pressable className="bg-surfaceCream rounded-3xl overflow-hidden mb-4 border border-buttonBorder shadow-card">
            <ImageBackground
                source={{ uri: devotional.imageURL }}
                style={{ width: '100%', minHeight: RPH(23) }}
                resizeMode="cover">
                {/* Linear gradient overlay for readability */}
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

                {/* Content */}
                <View style={{ padding: RPH(2), minHeight: RPH(23) }} className="pb-4 justify-between">
                    <View>
                        <Text style={{ fontSize: AppFonts[17], marginBottom: RPH(0.3) }} className="font-feather text-white">
                            {devotional.bibleReference}
                        </Text>
                        <Text style={{ fontSize: AppFonts[17], marginBottom: RPH(2) }} className="font-nunito-mediumItalic text-white shadow-lg leading-[26px]">
                            {formatDate(devotional.createdAt)}
                        </Text>
                        <Text style={{ fontSize: AppFonts[17] }} className="font-din text-white leading-[22px]">
                            {devotional.verse}
                        </Text>

                        {/* Unsave and Share buttons */}
                        <View className="flex-row items-center mt-4">
                            <TouchableOpacity onPress={handleLikePress} className="flex-row items-center mr-4">
                                <Ionicons name="heart" size={RPH(2.2)} color={"#FC8A02"} />
                                <Text className="ml-2 text-white font-din text-lg">Saved</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSharePress} className="flex-row items-center">
                                <FontAwesome5 name="share-alt" size={RPH(1.8)} color="white" />
                                <Text className="ml-2 text-white font-din text-lg">{shareCount}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Start Devotional Button */}
                    <View style={{ marginTop: RPH(1) }} className="w-full">
                        <PrimaryButton
                            title="Start Devotional"
                            onPress={handleStartDevotional}
                            buttonType="blue"

                        />
                    </View>
                </View>
            </ImageBackground>
        </Pressable>
    );
};

export default SavedDevotionalCard; 