import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { registerUser } from "../services/userService";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0: welcome, 1: name input

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous subtle rotation for logo
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    rotateAnimation.start();

    return () => rotateAnimation.stop();
  }, []);

  const handleGetStarted = () => {
    // Animate transition to step 1
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep(1);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      setError("Please enter at least 2 characters");
      return;
    }

    setLoading(true);
    setError("");
    Keyboard.dismiss();

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await registerUser(name.trim());

      // Success animation before completing
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    } catch (err) {
      setError("Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-3deg", "3deg"],
  });

  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }, { rotate: logoRotation }],
              },
            ]}
          >
            <Image
              source={require("../assets/images/MoodyLogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.textContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome to</Text>
            <Text style={styles.appName}>Moody</Text>
            <Text style={styles.tagline}>
              Track your emotions, understand yourself better
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresContainer,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.featureItem}>
              <Ionicons name="happy-outline" size={24} color="#4caf50" />
              <Text style={styles.featureText}>Log your daily mood</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="stats-chart-outline" size={24} color="#4caf50" />
              <Text style={styles.featureText}>View insights & patterns</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#4caf50"
              />
              <Text style={styles.featureText}>Get daily reminders</Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep(0);
            setError("");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#4caf50" />
        </TouchableOpacity>

        <View style={styles.nameInputContainer}>
          <Text style={styles.nameTitle}>What's your name?</Text>
          <Text style={styles.nameSubtitle}>
            Let's personalize your experience
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={24}
              color="#4caf50"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError("");
              }}
              autoFocus
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                (!name.trim() || loading) && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!name.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>
                {loading ? "Creating your profile..." : "Continue"}
              </Text>
              {!loading && (
                <Ionicons name="checkmark-circle" size={20} color="white" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  backgroundCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    top: -50,
    right: -100,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(76, 175, 80, 0.06)",
    bottom: 100,
    left: -50,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(129, 199, 132, 0.1)",
    bottom: -30,
    right: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContent: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    color: "#666",
    marginBottom: 5,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#2e7d32",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: "#66bb6a",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },
  featuresContainer: {
    marginTop: 20,
    marginBottom: 40,
    gap: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nameInputContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
  },
  nameTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 10,
  },
  nameSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 18,
    color: "#333",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 15,
  },
  errorText: {
    color: "#f44336",
    fontSize: 14,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 18,
    borderRadius: 15,
    gap: 10,
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#a5d6a7",
    shadowOpacity: 0,
  },
  continueText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
