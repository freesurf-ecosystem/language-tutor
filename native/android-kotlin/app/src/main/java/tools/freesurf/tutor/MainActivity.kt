package tools.freesurf.tutor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import tools.freesurf.tutor.ui.home.HomeScreen
import tools.freesurf.tutor.ui.theme.FreeSurfTutorTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FreeSurfTutorTheme {
                HomeScreen()
            }
        }
    }
}
