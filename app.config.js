require("dotenv").config();

module.exports = {
  expo: {
    name: "Moody",
    slug: "Moody",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/MoodyLogo.png",
    scheme: "moody",
    userInterfaceStyle: "automatic",
    newArchEnabled: true, // <--- CHANGED BACK TO TRUE (Required by Reanimated)
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.uminduisith.moody",
      adaptiveIcon: {
        foregroundImage: "./assets/images/MoodyLogo.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/MoodyLogo.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/MoodyLogo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false, // Keep this false for stability
    },
    extra: {
      eas: {
        projectId: "6300d073-00b2-4b7c-99ca-719bb5c8ef48",
      },
    },
  },
};
