import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

type Props = {
  onFinish: () => void;
};

export function AppLaunchIntro({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 380,
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
          toValue: 0.42,
          duration: 620,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 340,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [glowOpacity, logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
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
    width: 290,
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#8b2cff',
    shadowColor: '#9b35ff',
    shadowOpacity: 0.9,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logo: {
    width: 245,
    height: 245,
  },
});
