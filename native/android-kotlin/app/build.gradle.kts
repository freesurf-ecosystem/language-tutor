plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "tools.freesurf.tutor"
    compileSdk = 36

    defaultConfig {
        applicationId = "tools.freesurf.tutor"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        // BuildConfig holds public (publishable) config only — no secrets.
        buildConfigField("String", "WORKER_URL", "\"https://freesurf-language-tutor.freesurf.workers.dev\"")
        buildConfigField("String", "SUPABASE_URL", "\"https://jstojewashwoswsskwjk.supabase.co\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"sb_publishable_-nyuPas2pnqOcHMNJUCHog_xUlJbtuU\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
