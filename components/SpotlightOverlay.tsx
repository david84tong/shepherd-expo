import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SpotlightOverlayProps {
    visible: boolean;
    centerX?: number;
    centerY?: number;
    radius?: number;
    opacity?: number;
}

const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
    visible,
    centerX = width / 2,
    centerY = height * 0.45, // Adjust to match lamb position
    radius = 180,            // Adjust to match lamb size
    opacity = 1,
}) => {
    if (!visible) return null;

    return (
        <Svg
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 100,
                opacity,
            }}
        >
            <Defs>
                <RadialGradient
                    id="grad"
                    cx={centerX}
                    cy={centerY}
                    rx={radius * 1.3}
                    ry={radius * 1.3}
                    gradientUnits="userSpaceOnUse"
                >
                    {/* <Stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.6" /> */}
                    <Stop offset="35%" stopColor="#000" stopOpacity="0.1" />
                    <Stop offset="60%" stopColor="#000" stopOpacity="0.30" />
                    <Stop offset="85%" stopColor="#2e1d00" stopOpacity="0.60" />
                    <Stop offset="100%" stopColor="#2e1d00" stopOpacity="0.70" />

                </RadialGradient>
            </Defs>
            <Rect
                x="0"
                y="0"
                width={width}
                height={height}
                fill="url(#grad)"
            />
        </Svg>
    );
};

export default SpotlightOverlay;