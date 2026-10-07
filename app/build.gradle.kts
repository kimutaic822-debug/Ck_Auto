plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.ckauto.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.ckauto.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 10
        versionName = "1.9"
    }
    signingConfigs {
        create("release") {
            storeFile = file("../ckauto.jks")
            storePassword = "ckauto2026"
            keyAlias = "ckauto"
            keyPassword = "ckauto2026"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
