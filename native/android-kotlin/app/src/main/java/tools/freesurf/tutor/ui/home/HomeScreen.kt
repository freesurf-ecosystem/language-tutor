package tools.freesurf.tutor.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tools.freesurf.tutor.data.TutorBrain

/**
 * Placeholder home. Foundation scaffold only — real screens to build next:
 *   1. Auth (Supabase email/password + Google/Apple) + Onboarding consents.
 *   2. Native-language picker (TutorBrain.nativeLanguages) persisted to DataStore.
 *   3. Conversation screen: mic (RECORD_AUDIO) -> /api/tutor -> language-tagged segments + audio.
 *   4. Notes/Transcripts (local storage).
 */
@Composable
fun HomeScreen() {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(32.dp),
            ) {
                Text(
                    "FreeSurf English Tutor",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "Native Android (Kotlin/Compose) scaffold — auth, onboarding, voice tutor, and notes come next.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                )
                Text(
                    "Brain: ${TutorBrain.workerUrl}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
                Button(onClick = { /* TODO: start recording -> /api/tutor */ }) {
                    Text("Speak (coming soon)")
                }
            }
        }
    }
}
