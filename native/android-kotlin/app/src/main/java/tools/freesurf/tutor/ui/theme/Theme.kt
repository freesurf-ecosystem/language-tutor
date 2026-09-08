package tools.freesurf.tutor.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF3B6CFF),
    onPrimary = Color(0xFFFFFFFF),
    background = Color(0xFFFAFAFA),
    surface = Color(0xFFFFFFFF),
    error = Color(0xFFDC2626),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF5B8CFF),
    onPrimary = Color(0xFFFFFFFF),
    background = Color(0xFF000000),
    surface = Color(0xFF0D0D0D),
    error = Color(0xFFF87171),
)

@Composable
fun FreeSurfTutorTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
