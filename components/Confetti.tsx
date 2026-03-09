// components/Confetti.tsx — Celebration particle burst
import { useEffect, useRef, memo } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const COLORS  = ['#f87171', '#34d399', '#fbbf24', '#a78bfa', '#38bdf8', '#fb923c', '#f472b6', '#4ade80', '#facc15'];
const COUNT   = 70;

interface Piece {
    x:       Animated.Value;
    y:       Animated.Value;
    opacity: Animated.Value;
    rotate:  Animated.Value;
    color:   string;
    size:    number;
    startX:  number;
    circle:  boolean;
}

// Build pieces once (stable ref)
function buildPieces(): Piece[] {
    return Array.from({ length: COUNT }, () => ({
        x:       new Animated.Value(0),
        y:       new Animated.Value(0),
        opacity: new Animated.Value(0),
        rotate:  new Animated.Value(0),
        color:   COLORS[Math.floor(Math.random() * COLORS.length)],
        size:    5 + Math.random() * 7,
        startX:  Math.random() * W,
        circle:  Math.random() > 0.5,
    }));
}

interface Props {
    active:  boolean;
    onDone?: () => void;
}

export const Confetti = memo(function Confetti({ active, onDone }: Props) {
    const pieces = useRef<Piece[]>(buildPieces()).current;

    useEffect(() => {
        if (!active) return;

        // Reset all pieces
        pieces.forEach(p => {
            p.x.setValue(0);
            p.y.setValue(0);
            p.opacity.setValue(0);
            p.rotate.setValue(0);
        });

        const anims = pieces.map(p => {
            const delay    = Math.random() * 500;
            const duration = 1400 + Math.random() * 1200;
            const drift    = (Math.random() - 0.5) * 240;

            return Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(p.y,       { toValue: H * 0.9,  duration, useNativeDriver: true }),
                    Animated.timing(p.x,       { toValue: drift,    duration, useNativeDriver: true }),
                    Animated.timing(p.rotate,  { toValue: 1080,     duration, useNativeDriver: true }),
                    Animated.sequence([
                        Animated.timing(p.opacity, { toValue: 1,   duration: 80,              useNativeDriver: true }),
                        Animated.delay(duration - 700),
                        Animated.timing(p.opacity, { toValue: 0,   duration: 620,             useNativeDriver: true }),
                    ]),
                ]),
            ]);
        });

        Animated.parallel(anims).start(() => onDone?.());
    }, [active]);

    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {pieces.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        left:     p.startX,
                        top:      -16,
                        width:    p.size,
                        height:   p.size,
                        borderRadius: p.circle ? p.size / 2 : 2,
                        backgroundColor: p.color,
                        opacity: p.opacity,
                        transform: [
                            { translateX: p.x },
                            { translateY: p.y },
                            { rotate: p.rotate.interpolate({ inputRange: [0, 1080], outputRange: ['0deg', '1080deg'] }) },
                        ],
                    }}
                />
            ))}
        </View>
    );
});