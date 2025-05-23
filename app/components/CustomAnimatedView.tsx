import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { shouldAnimate } from '~/utils/accessibility';

interface CustomViewProps {
    children: React.ReactNode;
    style?: any;
    className?: string;
}

const CustomAnimatedView: React.FC<CustomViewProps> = ({ children, style, className }) => {
    if (shouldAnimate()) {
        return (
            <Animated.View style={style} className={className}>
                {children}
            </Animated.View>
        );
    }
    return (
        <View style={style} className={className}>
            {children}
        </View>
    );
};

export default CustomAnimatedView;
