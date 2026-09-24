import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

// Dans main.ts, après la création de la session
app.use(createLocaleDayjs(session.lang.value))

// Dans un composable ou un composant
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
const { dayjs, duration } = useLocaleDayjs()

// Synchronise la locale dayjs avec celle de la session DataFair
// Les formats de date s'adaptent automatiquement (fr, en, etc.)
