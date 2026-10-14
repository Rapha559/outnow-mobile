import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  onFinish: () => void;
};

export function AppLaunchIntro({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1.06,
          damping: 10,
          stiffness: 105,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.38,
          duration: 520,
          useNativeDriver: true,
        }),
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
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(brandTranslate, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(520),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [brandOpacity, brandTranslate, glowOpacity, logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <View style={styles.logoStage}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}>
          <Image
            source={require('../../assets/images/logo-glow.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStage: {
    width: 250,
    height: 250,
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
    shadowOpacity: 0.9,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  logo: {
    width: 210,
    height: 210,
  },
  brandWrap: {
    alignItems: 'center',
    marginTop: 14,
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
