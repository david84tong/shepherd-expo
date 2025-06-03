# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Keep WebGL classes
-keep class com.expo.modules.gl.** { *; }
-keep class expo.modules.gl.** { *; }
-keep class org.webrtc.** { *; }

# Keep Three.js classes
-keep class org.threejs.** { *; }
-keep class com.expo.three.** { *; }
-keep class expo.three.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep GLView
-keep class expo.modules.gl.GLView { *; }
-keep class com.expo.modules.gl.GLView { *; }

# Keep WebGL context
-keep class com.expo.modules.gl.GLContext { *; }
-keep class expo.modules.gl.GLContext { *; }
