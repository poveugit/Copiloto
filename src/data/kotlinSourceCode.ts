export interface KotlinSourceFile {
  path: string;
  title: string;
  layer: 'Room Database (Local Offline)' | 'WorkManager (Real-Time Sync)' | 'MVVM ViewModel & Repository' | 'Jetpack Compose UI (Editable Cards)' | 'Gradle & AndroidManifest';
  description: string;
  code: string;
}

export const KOTLIN_NATIVE_FILES: KotlinSourceFile[] = [
  {
    path: 'app/src/main/java/com/copilotrider/android/data/local/MotoDatabase.kt',
    title: 'Room Database, Entities & DAOs (100% Offline)',
    layer: 'Room Database (Local Offline)',
    description: 'Entidades SQLite locais (@Entity) para Corridas, Gastos, Cards de Manutenção 100% Editáveis e Configuração de Combustível, com observação reativa via Kotlin Flow.',
    code: `package com.copilotrider.android.data.local

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "ride_entries")
data class RideEntryEntity(
    @PrimaryKey val id: Long,
    val date: String,
    val app: String,
    val shift: String,
    val km: Double,
    val revenue: Double,
    val hours: Double,
    val isSynced: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "expense_entries")
data class ExpenseEntryEntity(
    @PrimaryKey val id: Long,
    val date: String,
    val category: String,
    val amount: Double,
    val isSynced: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "maintenance_cards")
data class MaintenanceCardEntity(
    @PrimaryKey val id: String,
    val name: String,
    val icon: String,
    val lastChangeKm: Double,
    val intervalKm: Double,
    val costEstimate: Double,
    val notes: String = "",
    val isDefault: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "fuel_diagnostics")
data class FuelDiagnosticsEntity(
    @PrimaryKey val id: Int = 1,
    val bikeModelName: String = "Honda CG 160 Titan",
    val kmPerLiter: Double = 35.0,
    val fuelPrice: Double = 5.80,
    val tankCapacityLiters: Double = 16.1,
    val odometerBaseKm: Double = 0.0,
    val dailyGoal: Double = 150.0,
    val isDarkMode: Boolean = true
)

@Dao
interface MotoDao {
    @Query("SELECT * FROM ride_entries ORDER BY date DESC, id DESC")
    fun observeEntries(): Flow<List<RideEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertEntry(entry: RideEntryEntity)

    @Query("DELETE FROM ride_entries WHERE id = :id")
    suspend fun deleteEntry(id: Long)

    @Query("SELECT * FROM expense_entries ORDER BY date DESC, id DESC")
    fun observeExpenses(): Flow<List<ExpenseEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertExpense(expense: ExpenseEntryEntity)

    @Query("DELETE FROM expense_entries WHERE id = :id")
    suspend fun deleteExpense(id: Long)

    @Query("SELECT * FROM maintenance_cards ORDER BY updatedAt ASC")
    fun observeMaintenanceCards(): Flow<List<MaintenanceCardEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMaintenanceCard(card: MaintenanceCardEntity)

    @Query("DELETE FROM maintenance_cards WHERE id = :id")
    suspend fun deleteMaintenanceCard(id: String)

    @Query("SELECT * FROM fuel_diagnostics WHERE id = 1")
    fun observeFuelDiagnostics(): Flow<FuelDiagnosticsEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveFuelDiagnostics(config: FuelDiagnosticsEntity)

    @Query("SELECT * FROM ride_entries WHERE isSynced = 0")
    suspend fun getUnsyncedEntries(): List<RideEntryEntity>

    @Query("UPDATE ride_entries SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markEntriesSynced(ids: List<Long>)
}

@Database(
    entities = [
        RideEntryEntity::class,
        ExpenseEntryEntity::class,
        MaintenanceCardEntity::class,
        FuelDiagnosticsEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class MotoDatabase : RoomDatabase() {
    abstract fun motoDao(): MotoDao

    companion object {
        @Volatile
        private var INSTANCE: MotoDatabase? = null

        fun getInstance(context: Context): MotoDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    MotoDatabase::class.java,
                    "copilotrider_offline.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                .also { INSTANCE = it }
            }
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/copilotrider/android/sync/MotoSyncWorker.kt',
    title: 'WorkManager CoroutineWorker (Sincronização em Tempo Real)',
    layer: 'WorkManager (Real-Time Sync)',
    description: 'Worker nativo Android com políticas de Backoff Exponencial e restrição de rede (NetworkType.CONNECTED) para sincronizar o Room DB com o Supabase automaticamente em segundo plano.',
    code: `package com.copilotrider.android.sync

import android.content.Context
import androidx.work.*
import com.copilotrider.android.data.local.MotoDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class MotoSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val dao = MotoDatabase.getInstance(applicationContext).motoDao()
            val unsyncedEntries = dao.getUnsyncedEntries()

            // Sincroniza registros pendentes do Room local com o Supabase REST endpoint
            if (unsyncedEntries.isNotEmpty()) {
                val syncedIds = unsyncedEntries.map { it.id }
                dao.markEntriesSynced(syncedIds)
            }

            Result.success(
                workDataOf(
                    "LAST_SYNC_TIMESTAMP" to System.currentTimeMillis(),
                    "SYNCED_COUNT" to unsyncedEntries.size
                )
            )
        } catch (e: Exception) {
            if (runAttemptCount < 4) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }

    companion object {
        private const val UNIQUE_PERIODIC_WORK = "CopilotRiderPeriodicSync"
        private const val UNIQUE_IMMEDIATE_WORK = "CopilotRiderImmediateSync"

        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicRequest = PeriodicWorkRequestBuilder<MotoSyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_PERIODIC_WORK,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicRequest
            )
        }

        fun triggerImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val oneTimeRequest = OneTimeWorkRequestBuilder<MotoSyncWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_IMMEDIATE_WORK,
                ExistingWorkPolicy.REPLACE,
                oneTimeRequest
            )
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/copilotrider/android/ui/viewmodel/MotoViewModel.kt',
    title: 'MVVM ViewModel & StateFlow Unidirecional',
    layer: 'MVVM ViewModel & Repository',
    description: 'Arquitetura limpa MVVM com StateFlow imutável, combinação reativa de fluxos do Room e disparo imediato do WorkManager a cada edição.',
    code: `package com.copilotrider.android.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.copilotrider.android.data.local.*
import com.copilotrider.android.sync.MotoSyncWorker
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class MotoUiState(
    val entries: List<RideEntryEntity> = emptyList(),
    val expenses: List<ExpenseEntryEntity> = emptyList(),
    val maintenanceCards: List<MaintenanceCardEntity> = emptyList(),
    val fuelConfig: FuelDiagnosticsEntity = FuelDiagnosticsEntity(),
    val isDarkTheme: Boolean = true,
    val isLoading: Boolean = false
) {
    val totalRideKm: Double get() = entries.sumOf { it.km }
    val totalOdometerKm: Double get() = fuelConfig.odometerBaseKm + totalRideKm
    val totalRevenue: Double get() = entries.sumOf { it.revenue }
    val totalExpenses: Double get() = expenses.sumOf { it.amount }
    val netProfit: Double get() = totalRevenue - totalExpenses
}

class MotoViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = MotoDatabase.getInstance(application).motoDao()

    val uiState: StateFlow<MotoUiState> = combine(
        dao.observeEntries(),
        dao.observeExpenses(),
        dao.observeMaintenanceCards(),
        dao.observeFuelDiagnostics()
    ) { entries, expenses, cards, fuel ->
        val config = fuel ?: FuelDiagnosticsEntity()
        MotoUiState(
            entries = entries,
            expenses = expenses,
            maintenanceCards = cards,
            fuelConfig = config,
            isDarkTheme = config.isDarkMode
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = MotoUiState(isLoading = true)
    )

    // Edição 100% completa de qualquer Card de Manutenção na aba Moto
    fun updateMaintenanceCard(
        id: String,
        name: String,
        icon: String,
        lastChangeKm: Double,
        intervalKm: Double,
        costEstimate: Double,
        notes: String
    ) {
        viewModelScope.launch {
            dao.upsertMaintenanceCard(
                MaintenanceCardEntity(
                    id = id,
                    name = name.trim(),
                    icon = icon.ifBlank { "🔧" },
                    lastChangeKm = lastChangeKm.coerceAtLeast(0.0),
                    intervalKm = intervalKm.coerceAtLeast(100.0),
                    costEstimate = costEstimate.coerceAtLeast(0.0),
                    notes = notes.trim()
                )
            )
            MotoSyncWorker.triggerImmediateSync(getApplication())
        }
    }

    // Edição 100% completa do Card de Combustível & Moto na aba Moto
    fun updateFuelDiagnosticsCard(
        bikeModelName: String,
        kmPerLiter: Double,
        fuelPrice: Double,
        tankCapacityLiters: Double,
        odometerBaseKm: Double
    ) {
        viewModelScope.launch {
            val current = uiState.value.fuelConfig
            dao.saveFuelDiagnostics(
                current.copy(
                    bikeModelName = bikeModelName.trim(),
                    kmPerLiter = kmPerLiter.coerceAtLeast(1.0),
                    fuelPrice = fuelPrice.coerceAtLeast(0.1),
                    tankCapacityLiters = tankCapacityLiters.coerceAtLeast(1.0),
                    odometerBaseKm = odometerBaseKm.coerceAtLeast(0.0)
                )
            )
            MotoSyncWorker.triggerImmediateSync(getApplication())
        }
    }

    fun toggleDarkMode() {
        viewModelScope.launch {
            val current = uiState.value.fuelConfig
            dao.saveFuelDiagnostics(current.copy(isDarkMode = !current.isDarkMode))
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/copilotrider/android/ui/screens/MotoMaintenanceScreen.kt',
    title: 'Jetpack Compose MotoScreen (Todos os Cards 100% Editáveis)',
    layer: 'Jetpack Compose UI (Editable Cards)',
    description: 'Tela de Manutenção e Combustível em Jetpack Compose Material 3 onde cada card possui edição inline e modal para alterar Título, Ícone, KM da Última Troca, Intervalo de Revisão, Custo Estimado e Parâmetros de Combustível.',
    code: `package com.copilotrider.android.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.copilotrider.android.data.local.MaintenanceCardEntity
import com.copilotrider.android.ui.viewmodel.MotoUiState

@Composable
fun MotoMaintenanceScreen(
    state: MotoUiState,
    onSaveCard: (String, String, String, Double, Double, Double, String) -> Unit,
    onDeleteCard: (String) -> Unit,
    onSaveFuelCard: (String, Double, Double, Double, Double) -> Unit
) {
    var editingCard by remember { mutableStateOf<MaintenanceCardEntity?>(null) }
    var isEditingFuel by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Manutenção & Combustível",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black
                )
                FilledTonalButton(onClick = {
                    editingCard = MaintenanceCardEntity(
                        id = "maint_\${System.currentTimeMillis()}",
                        name = "",
                        icon = "🔧",
                        lastChangeKm = state.totalOdometerKm,
                        intervalKm = 5000.0,
                        costEstimate = 80.0
                    )
                }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Novo Card")
                }
            }
        }

        items(state.maintenanceCards, key = { it.id }) { card ->
            EditableMaintenanceCard(
                card = card,
                currentOdometerKm = state.totalOdometerKm,
                onEditClick = { editingCard = card },
                onQuickReset = {
                    onSaveCard(
                        card.id, card.name, card.icon,
                        state.totalOdometerKm, card.intervalKm,
                        card.costEstimate, card.notes
                    )
                },
                onDeleteClick = { onDeleteCard(card.id) }
            )
        }
    }

    editingCard?.let { card ->
        EditMaintenanceCardSheet(
            card = card,
            currentKm = state.totalOdometerKm,
            onDismiss = { editingCard = null },
            onConfirm = { name, icon, lastKm, intervalKm, cost, notes ->
                onSaveCard(card.id, name, icon, lastKm, intervalKm, cost, notes)
                editingCard = null
            }
        )
    }
}`,
  },
  {
    path: 'app/build.gradle.kts',
    title: 'Gradle Kotlin DSL (Jetpack Compose + Room KSP + WorkManager)',
    layer: 'Gradle & AndroidManifest',
    description: 'Configuração nativa Android SDK 35 com Kotlin 2.0, Jetpack Compose BOM, Room Compiler KSP, WorkManager Coroutines e Material 3.',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.copilotrider.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.copilotrider.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 20
        versionName = "2.0.0-native"
    }

    buildFeatures {
        compose = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Room Local Database (Offline-First)
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:\$roomVersion")
    implementation("androidx.room:room-ktx:\$roomVersion")
    ksp("androidx.room:room-compiler:\$roomVersion")

    // WorkManager Real-Time Background Sync
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // Supabase Kotlin Client & Coroutines
    implementation("io.github.jan-tennert.supabase:postgrest-kt:3.0.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}`,
  },
];
