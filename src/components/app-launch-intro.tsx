import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  onFinish: () => void;
};

export function AppLaunchIntro({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.68)).current;
  const logoMotion = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.5)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(14)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ringOneAnimation = Animated.sequence([
      Animated.delay(120),
      Animated.timing(ringOne, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]);

    const ringTwoAnimation = Animated.sequence([
      Animated.delay(360),
      Animated.timing(ringTwo, {
        toValue: 1,
        duration: 950,
        useNativeDriver: true,
      }),
    ]);

    const introAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1.08,
          damping: 9,
          stiffness: 110,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.42,
          duration: 560,
          useNativeDriver: true,
        }),
        Animated.timing(logoMotion, {
          toValue: 1,
          duration: 780,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(260),
          Animated.parallel([
            Animated.timing(sparkleOpacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.spring(sparkleScale, {
              toValue: 1,
              damping: 8,
              stiffness: 150,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(sparkleOpacity, {
            toValue: 0.28,
            duration: 420,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(brandTranslate, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(720),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]);

    const all = Animated.parallel([
      introAnimation,
      ringOneAnimation,
      ringTwoAnimation,
    ]);

    all.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => all.stop();
  }, [
    brandOpacity,
    brandTranslate,
    glowOpacity,
    logoMotion,
    logoOpacity,
    logoScale,
    onFinish,
    ringOne,
    ringTwo,
    screenOpacity,
    sparkleOpacity,
    sparkleScale,
  ]);

  const rotate = logoMotion.interpolate({
    inputRange: [0, 0.45, 0.72, 1],
    outputRange: ['-5deg', '3deg', '-1deg', '0deg'],
  });

  const translateY = logoMotion.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [14, -6, 0],
  });

  const ringOneScale = ringOne.interpolate({
    inputRange: [0, 1],
    outputRange: [0.74, 1.42],
  });
  const ringOneOpacity = ringOne.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.42, 0],
  });

  const ringTwoScale = ringTwo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1.58],
  });
  const ringTwoOpacity = ringTwo.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.28, 0],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
      <View style={styles.logoStage}>
        <Animated.View
          style={[
            styles.energyRing,
            {
              opacity: ringOneOpacity,
              transform: [{ scale: ringOneScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.energyRingOuter,
            {
              opacity: ringTwoOpacity,
              transform: [{ scale: ringTwoScale }],
            },
          ]}
        />
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkleTop,
            { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}>
          <Text style={styles.sparkleText}>✦</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkleRight,
            { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkleLeft,
            { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.emblemWrap,
            {
              opacity: logoOpacity,
              transform: [
                { translateY },
                { rotate },
                { scale: logoScale },
              ],
            },
          ]}>
          <View style={styles.logoRing}>
            <View style={styles.logoRingInner}>
              <View style={styles.iconContainer}>
                <View style={styles.ticket}>
                  <View style={styles.perforationColumn}>
                    <View style={styles.perforationDash} />
                    <View style={styles.perforationDash} />
                    <View style={styles.perforationDash} />
                    <View style={styles.perforationDash} />
                  </View>
                </View>
                <View style={[styles.iconDot, styles.iconDotTop]} />
                <View style={[styles.iconDot, styles.iconDotBottom]} />
                <View style={[styles.iconDot, styles.iconDotLeft]} />
                <View style={[styles.iconDot, styles.iconDotRight]} />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.brandWrap,
          {
            opacity: brandOpacity,
            transform: [{ translateY: brandTranslate }],
          },
        ]}>
        <Text style={styles.brand}>OUTNOW</Text>
        <Text style={styles.tagline}>TICKETS · EVENTS · NOW</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStage: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#8b2cff',
    shadowColor: '#9b35ff',
    shadowOpacity: 0.95,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  energyRing: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderColor: '#9b5cff',
  },
  energyRingOuter: {
    position: 'absolute',
    width: 215,
    height: 215,
    borderRadius: 108,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  emblemWrap: {
    width: 215,
    height: 215,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    width: 202,
    height: 202,
    borderRadius: 101,
    borderWidth: 15,
    borderColor: '#9333ea',
    backgroundColor: '#2e1065',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOpacity: 0.95,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoRingInner: {
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // This fixed, relative canvas is the only coordinate system for the ticket
  // and its four cut-out dots. It keeps the mark identical on iOS and Android
  // regardless of the screen dimensions or safe-area insets.
  iconContainer: {
    position: 'relative',
    width: 112,
    height: 112,
    overflow: 'visible',
  },
  ticket: {
    position: 'absolute',
    top: 4,
    left: 14,
    width: 84,
    height: 104,
    borderRadius: 15,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d946ef',
    shadowOpacity: 0.75,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  iconDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#050505',
    zIndex: 2,
  },
  iconDotTop: {
    top: 0,
    left: 44,
  },
  iconDotBottom: {
    bottom: 0,
    left: 44,
  },
  iconDotLeft: {
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    top: 38,
  },
  iconDotRight: {
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    top: 38,
  },
  perforationColumn: {
    gap: 8,
    alignItems: 'center',
  },
  perforationDash: {
    width: 7,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#2e1065',
  },
  sparkle: {
    position: 'absolute',
    zIndex: 3,
  },
  sparkleTop: {
    top: 20,
    right: 43,
  },
  sparkleRight: {
    right: 16,
    bottom: 72,
  },
  sparkleLeft: {
    left: 18,
    top: 92,
  },
  sparkleText: {
    color: '#d8b4fe',
    fontSize: 26,
    textShadowColor: '#9333ea',
    textShadowRadius: 12,
  },
  sparkleTextSmall: {
    color: '#a78bfa',
    fontSize: 17,
    textShadowColor: '#7c3aed',
    textShadowRadius: 9,
  },
  brandWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  brand: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 5,
  },
  tagline: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.1,
    marginTop: 8,
  },
});
