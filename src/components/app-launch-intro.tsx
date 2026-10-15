import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  onFinish: () => void;
};

export function AppLaunchIntro({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1.06,
          damping: 10,
          stiffness: 105,
          mass: 0.8,
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
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(brandTranslate, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [brandOpacity, brandTranslate, logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
      <View style={styles.logoStage}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

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
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b2cff',
    shadowOpacity: 0.42,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  logo: {
    width: 235,
    height: 235,
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
