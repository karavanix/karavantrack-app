import { useTranslation } from "react-i18next";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Bell,
  UserCheck,
  Trash2,
  Mail,
  MapPin,
  Smartphone,
} from "lucide-react";

const EFFECTIVE_DATE = "April 5, 2026";
const CONTACT_EMAIL = "support@yool.live";
const APP_NAME = "YOOL";
const COMPANY_NAME = "YOOL";

export default function PrivacyPolicyPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const isRu = lang === "ru";
  const isUz = lang === "uz";

  if (isRu) return <PrivacyRu />;
  if (isUz) return <PrivacyUz />;
  return <PrivacyEn />;
}

/* ───────────────────────── Shared layout ───────────────────────── */

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              {APP_NAME}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {children && (children as React.ReactElement[])[0]}
          </h1>
          <p className="text-muted-foreground text-lg">
            {children && (children as React.ReactElement[])[1]}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-10">
          {children && (children as React.ReactElement[]).slice(2)}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm text-primary hover:underline flex items-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-6 sm:p-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-muted-foreground leading-relaxed space-y-3 text-sm sm:text-base">
        {children}
      </div>
    </section>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── English ───────────────────────── */

function PrivacyEn() {
  return (
    <Layout>
      <>Privacy Policy</>
      <>Effective date: {EFFECTIVE_DATE}</>

      <Section icon={Eye} title="1. Information We Collect">
        <p>
          This Privacy Policy applies to the {APP_NAME} web platform for shippers and the{" "}
          {APP_NAME} mobile application for carriers and drivers (collectively, "the Services").
          We collect information you provide directly and information collected automatically
          when you use the Services.
        </p>
        <p className="font-medium mt-3">Account and profile information:</p>
        <Ul
          items={[
            "Name (first and last), email address, phone number, and password.",
            "Company name and company identifier (shipper accounts).",
            "User role (shipper or carrier).",
          ]}
        />
        <p className="font-medium mt-3">Shipment and logistics data:</p>
        <Ul
          items={[
            "Pickup and dropoff addresses and coordinates for shipment loads.",
            "Load details: title, description, reference ID, status, and timestamps.",
            "Carrier assignments and delivery status history.",
          ]}
        />
        <p className="font-medium mt-3">Location data (mobile app — carriers):</p>
        <Ul
          items={[
            "Real-time GPS coordinates (latitude and longitude) collected while a load is active.",
            "Speed, heading (direction of travel), and GPS accuracy.",
            "Location data collected in the background via a foreground service, even when the app is not in the foreground, while a delivery is in progress.",
          ]}
        />
        <p className="font-medium mt-3">Device and usage information:</p>
        <Ul
          items={[
            "Device type, operating system, app version, and device identifier.",
            "Push notification tokens (used to deliver notifications to your device).",
            "Pages visited, features used, and actions taken within the Services.",
            "Authentication tokens stored locally on your device for session management.",
          ]}
        />
      </Section>

      <Section icon={Database} title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <Ul
          items={[
            "Provide, maintain, and improve the YOOL platform and mobile application.",
            "Authenticate users and protect account security.",
            "Enable shippers to create and manage shipment loads, assign carriers, and monitor deliveries.",
            "Enable carriers to view assigned loads, accept deliveries, and report their progress.",
            "Track carrier location in real time during active deliveries so shippers can monitor shipment status.",
            "Send transactional notifications about load assignments, status changes, and account activity.",
            "Respond to your support requests and inquiries.",
            "Comply with legal obligations.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="3. Location Data and Background Tracking">
        <p>
          <strong>This section applies to carriers and drivers using the {APP_NAME} mobile application.</strong>
        </p>
        <p>
          When you accept a delivery, the app collects your GPS location continuously to enable
          real-time tracking for the shipper. Location data is transmitted to our servers
          periodically (approximately every 10 minutes) and upon movement detection.
        </p>
        <p>
          <strong>Background location access:</strong> The app uses an Android foreground service
          to collect your location even when the app is minimized or the screen is off. A
          persistent notification is displayed while background tracking is active. This is
          necessary to provide reliable delivery tracking and is only active during an in-progress
          delivery.
        </p>
        <p>
          <strong>When tracking stops:</strong> Location tracking stops automatically when the
          delivery is completed or cancelled, or when you log out. The foreground service is
          terminated and no further location data is collected until a new delivery is accepted.
        </p>
        <p>
          You may revoke location permissions at any time through your device settings. However,
          this will prevent you from accepting and completing deliveries through the app.
        </p>
      </Section>

      <Section icon={Lock} title="4. Data Sharing and Disclosure">
        <p>
          We do not sell, trade, or rent your personal information to third parties. We may share
          your data in limited circumstances:
        </p>
        <Ul
          items={[
            "Carrier location data is shared with the shipper who assigned the load, for delivery tracking purposes.",
            "With team members within your company as required for load management.",
            "With service providers who assist us in operating the platform (e.g., cloud hosting, map services).",
            "When required by law, regulation, or valid legal process.",
            "To protect the rights, safety, and security of our users and the public.",
          ]}
        />
      </Section>

      <Section icon={Bell} title="5. Notifications">
        <p>
          We may send push notifications and in-app alerts related to load assignments, status
          changes, and account activity. To deliver push notifications, we collect and store a
          device token associated with your account. You can manage notification preferences in
          your device settings or within the app.
        </p>
      </Section>

      <Section icon={Smartphone} title="6. Data Stored on Your Device">
        <p>
          The mobile application stores certain data locally on your device for functionality
          and performance:
        </p>
        <Ul
          items={[
            "Authentication tokens and refresh tokens for secure session management.",
            "Cached user profile data for offline access.",
            "Language and theme preferences.",
            "Active load context for background location reporting.",
          ]}
        />
        <p>
          This data is stored using the device's secure local storage and is cleared when you
          log out or uninstall the app.
        </p>
      </Section>

      <Section icon={UserCheck} title="7. Data Retention">
        <p>
          We retain your personal data for as long as your account is active or as needed to
          provide our Services. Location tracking data is retained for the duration necessary
          to support delivery operations and dispute resolution. You may request deletion of
          your account and associated data at any time by contacting us. Upon account deletion,
          your data will be removed within 30 days, except where retention is required by law.
        </p>
      </Section>

      <Section icon={Shield} title="8. Data Security">
        <p>
          We implement appropriate technical and organizational measures to protect your personal
          information against unauthorized access, alteration, disclosure, or destruction. These
          include:
        </p>
        <Ul
          items={[
            "Encrypted data transmission (HTTPS/TLS) for all communications between the app and our servers.",
            "Secure token-based authentication with automatic token refresh.",
            "Regular security reviews and access controls.",
            "Local data stored using platform-provided secure storage mechanisms.",
          ]}
        />
      </Section>

      <Section icon={Trash2} title="9. Your Rights">
        <p>Depending on your location, you may have the right to:</p>
        <Ul
          items={[
            "Access the personal information we hold about you.",
            "Correct inaccurate or incomplete information.",
            "Request deletion of your personal data.",
            "Object to or restrict certain processing activities.",
            "Data portability — receive your data in a machine-readable format.",
            "Withdraw consent for location tracking at any time via device settings.",
          ]}
        />
        <p className="mt-3">
          To exercise any of these rights, please contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section icon={Mail} title="10. Children's Privacy">
        <p>
          Our Services are not directed to individuals under the age of 13. We do not knowingly
          collect personal information from children. If we become aware that a child has provided
          us with personal information, we will take steps to delete such information.
        </p>
      </Section>

      <Section icon={Eye} title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by posting a notice within the app or by email. Continued use of the Services
          after any changes constitutes your acceptance of the new policy.
        </p>
      </Section>

      <Section icon={Mail} title="12. Contact Us">
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices,
          please contact us at:
        </p>
        <p className="mt-2">
          <strong>{COMPANY_NAME}</strong>
          <br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </Layout>
  );
}

/* ───────────────────────── Russian ───────────────────────── */

function PrivacyRu() {
  return (
    <Layout>
      <>Политика конфиденциальности</>
      <>Дата вступления в силу: {EFFECTIVE_DATE}</>

      <Section icon={Eye} title="1. Информация, которую мы собираем">
        <p>
          Настоящая Политика конфиденциальности распространяется на веб-платформу {APP_NAME} для
          грузоотправителей и мобильное приложение {APP_NAME} для перевозчиков и водителей
          (совместно — «Сервисы»). Мы собираем информацию, которую вы предоставляете напрямую,
          а также информацию, собираемую автоматически при использовании Сервисов.
        </p>
        <p className="font-medium mt-3">Данные аккаунта и профиля:</p>
        <Ul
          items={[
            "Имя и фамилия, адрес электронной почты, номер телефона и пароль.",
            "Название компании и идентификатор компании (аккаунты грузоотправителей).",
            "Роль пользователя (грузоотправитель или перевозчик).",
          ]}
        />
        <p className="font-medium mt-3">Данные о грузах и логистике:</p>
        <Ul
          items={[
            "Адреса и координаты пунктов погрузки и выгрузки.",
            "Детали заказа: название, описание, справочный номер, статус и временные метки.",
            "Назначения перевозчиков и история статусов доставки.",
          ]}
        />
        <p className="font-medium mt-3">Данные о местоположении (мобильное приложение — перевозчики):</p>
        <Ul
          items={[
            "GPS-координаты в реальном времени (широта и долгота), собираемые во время активной доставки.",
            "Скорость, направление движения и точность GPS.",
            "Данные о местоположении, собираемые в фоновом режиме через foreground-сервис, даже когда приложение свёрнуто, пока доставка выполняется.",
          ]}
        />
        <p className="font-medium mt-3">Информация об устройстве и использовании:</p>
        <Ul
          items={[
            "Тип устройства, операционная система, версия приложения и идентификатор устройства.",
            "Токены push-уведомлений (используются для доставки уведомлений на ваше устройство).",
            "Посещённые страницы, используемые функции и действия в Сервисах.",
            "Токены аутентификации, хранящиеся локально на устройстве для управления сессиями.",
          ]}
        />
      </Section>

      <Section icon={Database} title="2. Как мы используем вашу информацию">
        <p>Мы используем собранную информацию для:</p>
        <Ul
          items={[
            "Предоставления, поддержки и улучшения платформы YOOL и мобильного приложения.",
            "Аутентификации пользователей и защиты безопасности аккаунта.",
            "Создания и управления грузовыми заказами, назначения перевозчиков и мониторинга доставок (грузоотправители).",
            "Просмотра назначенных грузов, принятия доставок и отчётности о ходе выполнения (перевозчики).",
            "Отслеживания местоположения перевозчика в реальном времени во время активных доставок.",
            "Отправки уведомлений о назначениях, изменениях статуса и активности аккаунта.",
            "Ответа на ваши запросы в службу поддержки.",
            "Соблюдения законодательных требований.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="3. Данные о местоположении и фоновое отслеживание">
        <p>
          <strong>Этот раздел относится к перевозчикам и водителям, использующим мобильное приложение {APP_NAME}.</strong>
        </p>
        <p>
          Когда вы принимаете доставку, приложение непрерывно собирает ваше GPS-местоположение
          для отслеживания в реальном времени грузоотправителем. Данные о местоположении
          передаются на наши серверы периодически (примерно каждые 10 минут) и при обнаружении
          движения.
        </p>
        <p>
          <strong>Фоновый доступ к местоположению:</strong> приложение использует Android
          foreground-сервис для сбора вашего местоположения, даже когда приложение свёрнуто
          или экран выключен. Постоянное уведомление отображается, пока фоновое отслеживание
          активно. Это необходимо для обеспечения надёжного отслеживания доставки и активно
          только во время выполняемой доставки.
        </p>
        <p>
          <strong>Когда отслеживание прекращается:</strong> отслеживание местоположения
          прекращается автоматически при завершении или отмене доставки, а также при выходе
          из аккаунта. Foreground-сервис останавливается, и дальнейшие данные о местоположении
          не собираются до принятия новой доставки.
        </p>
        <p>
          Вы можете отозвать разрешение на доступ к местоположению в любое время через настройки
          устройства. Однако это не позволит вам принимать и выполнять доставки через приложение.
        </p>
      </Section>

      <Section icon={Lock} title="4. Раскрытие данных третьим лицам">
        <p>
          Мы не продаём, не обмениваем и не передаём в аренду ваши персональные данные третьим
          лицам. Мы можем передавать данные в ограниченных случаях:
        </p>
        <Ul
          items={[
            "Данные о местоположении перевозчика передаются грузоотправителю, назначившему груз, для отслеживания доставки.",
            "Членам команды внутри вашей компании для управления грузами.",
            "Поставщикам услуг, помогающим в работе платформы (например, облачный хостинг, картографические сервисы).",
            "По требованию закона, нормативных актов или законного судебного процесса.",
            "Для защиты прав, безопасности наших пользователей и общества.",
          ]}
        />
      </Section>

      <Section icon={Bell} title="5. Уведомления">
        <p>
          Мы можем отправлять push-уведомления и внутриприложенческие оповещения о назначениях
          грузов, изменениях статуса и активности аккаунта. Для доставки push-уведомлений мы
          собираем и храним токен устройства, связанный с вашим аккаунтом. Вы можете управлять
          настройками уведомлений в настройках устройства или в приложении.
        </p>
      </Section>

      <Section icon={Smartphone} title="6. Данные, хранящиеся на вашем устройстве">
        <p>
          Мобильное приложение хранит определённые данные локально на вашем устройстве для
          обеспечения функциональности и производительности:
        </p>
        <Ul
          items={[
            "Токены аутентификации и токены обновления для безопасного управления сессиями.",
            "Кэшированные данные профиля для доступа в офлайн-режиме.",
            "Настройки языка и темы.",
            "Контекст активного заказа для фоновой отчётности о местоположении.",
          ]}
        />
        <p>
          Эти данные хранятся с использованием защищённого локального хранилища устройства
          и удаляются при выходе из аккаунта или удалении приложения.
        </p>
      </Section>

      <Section icon={UserCheck} title="7. Хранение данных">
        <p>
          Мы храним ваши персональные данные до тех пор, пока ваш аккаунт активен или пока это
          необходимо для предоставления Сервисов. Данные отслеживания местоположения хранятся
          в течение срока, необходимого для поддержки операций доставки и разрешения споров.
          Вы можете запросить удаление аккаунта и связанных данных в любое время, связавшись
          с нами. После удаления аккаунта данные будут удалены в течение 30 дней, за
          исключением случаев, когда хранение требуется по закону.
        </p>
      </Section>

      <Section icon={Shield} title="8. Безопасность данных">
        <p>
          Мы применяем соответствующие технические и организационные меры для защиты вашей
          персональной информации от несанкционированного доступа, изменения, раскрытия или
          уничтожения. В том числе:
        </p>
        <Ul
          items={[
            "Шифрование передачи данных (HTTPS/TLS) для всех коммуникаций между приложением и серверами.",
            "Безопасная аутентификация на основе токенов с автоматическим обновлением.",
            "Регулярные проверки безопасности и контроль доступа.",
            "Локальные данные хранятся с использованием безопасных механизмов хранения платформы.",
          ]}
        />
      </Section>

      <Section icon={Trash2} title="9. Ваши права">
        <p>В зависимости от вашего местонахождения вы можете иметь право:</p>
        <Ul
          items={[
            "Получить доступ к хранящейся у нас персональной информации.",
            "Исправить неточную или неполную информацию.",
            "Запросить удаление ваших персональных данных.",
            "Возразить против определённых видов обработки данных или ограничить их.",
            "Перенести данные — получить их в машиночитаемом формате.",
            "Отозвать согласие на отслеживание местоположения в любое время через настройки устройства.",
          ]}
        />
        <p className="mt-3">
          Для реализации этих прав обратитесь к нам по адресу:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section icon={Mail} title="10. Конфиденциальность детей">
        <p>
          Наши Сервисы не предназначены для лиц младше 13 лет. Мы не собираем намеренно
          персональные данные детей. Если нам станет известно, что ребёнок предоставил нам
          персональную информацию, мы примем меры по её удалению.
        </p>
      </Section>

      <Section icon={Eye} title="11. Изменения настоящей политики">
        <p>
          Мы можем периодически обновлять настоящую Политику конфиденциальности. О существенных
          изменениях мы сообщим через уведомление в приложении или по электронной почте.
          Продолжение использования Сервисов после внесения изменений означает ваше согласие
          с новой политикой.
        </p>
      </Section>

      <Section icon={Mail} title="12. Свяжитесь с нами">
        <p>
          Если у вас есть вопросы или опасения относительно настоящей Политики конфиденциальности
          или наших методов работы с данными, свяжитесь с нами:
        </p>
        <p className="mt-2">
          <strong>{COMPANY_NAME}</strong>
          <br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </Layout>
  );
}

/* ───────────────────────── Uzbek ───────────────────────── */

function PrivacyUz() {
  return (
    <Layout>
      <>Maxfiylik siyosati</>
      <>Kuchga kirish sanasi: {EFFECTIVE_DATE}</>

      <Section icon={Eye} title="1. Biz to'playdigan ma'lumotlar">
        <p>
          Ushbu Maxfiylik siyosati yuk jo'natuvchilar uchun {APP_NAME} veb-platformasiga va
          tashuvchilar hamda haydovchilar uchun {APP_NAME} mobil ilovasiga (birgalikda —
          "Xizmatlar") taalluqlidir. Biz siz to'g'ridan-to'g'ri taqdim etgan ma'lumotlarni
          va Xizmatlardan foydalanganingizda avtomatik to'planadigan ma'lumotlarni yig'amiz.
        </p>
        <p className="font-medium mt-3">Hisob va profil ma'lumotlari:</p>
        <Ul
          items={[
            "Ism va familiya, elektron pochta manzili, telefon raqami va parol.",
            "Kompaniya nomi va identifikatori (yuk jo'natuvchi hisoblari).",
            "Foydalanuvchi roli (yuk jo'natuvchi yoki tashuvchi).",
          ]}
        />
        <p className="font-medium mt-3">Yuk va logistika ma'lumotlari:</p>
        <Ul
          items={[
            "Yuklarni olib ketish va yetkazib berish manzillari va koordinatalari.",
            "Yuk tafsilotlari: nomi, tavsifi, havola raqami, holati va vaqt belgilari.",
            "Tashuvchi tayinlashlari va yetkazib berish holati tarixi.",
          ]}
        />
        <p className="font-medium mt-3">Joylashuv ma'lumotlari (mobil ilova — tashuvchilar):</p>
        <Ul
          items={[
            "Real vaqtdagi GPS koordinatalari (kenglik va uzunlik), faol yetkazib berish davomida to'planadi.",
            "Tezlik, harakat yo'nalishi va GPS aniqligi.",
            "Ilova yopilgan bo'lsa ham, foreground-xizmat orqali fonda to'planadigan joylashuv ma'lumotlari — faqat yetkazib berish davomida.",
          ]}
        />
        <p className="font-medium mt-3">Qurilma va foydalanish ma'lumotlari:</p>
        <Ul
          items={[
            "Qurilma turi, operatsion tizim, ilova versiyasi va qurilma identifikatori.",
            "Push-bildirishnoma tokenlari (qurilmangizga bildirishnomalar yetkazish uchun).",
            "Tashrif buyurilgan sahifalar, ishlatiladigan funksiyalar va Xizmatlardagi harakatlar.",
            "Sessiyalarni boshqarish uchun qurilmada mahalliy saqlanadigan autentifikatsiya tokenlari.",
          ]}
        />
      </Section>

      <Section icon={Database} title="2. Ma'lumotlardan foydalanish">
        <p>Biz to'plangan ma'lumotlardan quyidagi maqsadlarda foydalanamiz:</p>
        <Ul
          items={[
            "YOOL platformasi va mobil ilovasini taqdim etish, saqlash va yaxshilash.",
            "Foydalanuvchilarni autentifikatsiya qilish va hisob xavfsizligini ta'minlash.",
            "Yuk jo'natuvchilarga yuklar yaratish, boshqarish, tashuvchilarni tayinlash va yetkazib berishni kuzatish imkonini berish.",
            "Tashuvchilarga tayinlangan yuklarni ko'rish, qabul qilish va jarayonni hisobot qilish imkonini berish.",
            "Faol yetkazib berish davomida tashuvchi joylashuvini real vaqtda kuzatish.",
            "Tayinlashlar, holat o'zgarishlari va hisob faoliyati haqida bildirishnomalar yuborish.",
            "Qo'llab-quvvatlash so'rovlaringizga javob berish.",
            "Qonuniy majburiyatlarni bajarish.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="3. Joylashuv ma'lumotlari va fonda kuzatuv">
        <p>
          <strong>Ushbu bo'lim {APP_NAME} mobil ilovasidan foydalanuvchi tashuvchilar va haydovchilarga tegishli.</strong>
        </p>
        <p>
          Siz yetkazib berishni qabul qilganingizda, ilova yuk jo'natuvchi uchun real vaqtda
          kuzatuvni ta'minlash maqsadida GPS joylashuvingizni doimiy ravishda to'playdi.
          Joylashuv ma'lumotlari serverlarimizga davriy ravishda (taxminan har 10 daqiqada)
          va harakat aniqlanganda uzatiladi.
        </p>
        <p>
          <strong>Fonda joylashuvga kirish:</strong> ilova Android foreground-xizmatidan
          foydalanib, ilova yopilgan yoki ekran o'chirilgan bo'lsa ham joylashuvingizni
          to'playdi. Fonda kuzatuv faol bo'lganida doimiy bildirishnoma ko'rsatiladi. Bu
          ishonchli yetkazib berish kuzatuvini ta'minlash uchun zarur bo'lib, faqat
          yetkazib berish davomida faoldir.
        </p>
        <p>
          <strong>Kuzatuv qachon to'xtaydi:</strong> joylashuvni kuzatish yetkazib berish
          tugallanganda yoki bekor qilinganda, shuningdek hisobdan chiqqaningizda avtomatik
          ravishda to'xtaydi. Foreground-xizmat to'xtatiladi va yangi yetkazib berish qabul
          qilinmaguncha boshqa joylashuv ma'lumotlari to'planmaydi.
        </p>
        <p>
          Qurilma sozlamalari orqali joylashuvga ruxsatni istalgan vaqtda bekor qilishingiz
          mumkin. Biroq, bu ilova orqali yetkazib berishni qabul qilish va bajarishga
          to'sqinlik qiladi.
        </p>
      </Section>

      <Section icon={Lock} title="4. Ma'lumotlarni uchinchi tomonlar bilan ulashish">
        <p>
          Biz shaxsiy ma'lumotlaringizni uchinchi tomonlarga sotmaymiz, almashmaymiz yoki
          ijaraga bermaymiz. Ma'lumotlar cheklangan hollarda ulashilishi mumkin:
        </p>
        <Ul
          items={[
            "Tashuvchi joylashuv ma'lumotlari yukni tayinlagan yuk jo'natuvchi bilan yetkazib berishni kuzatish maqsadida ulashiladi.",
            "Yuk boshqaruvi uchun kompaniyangiz ichidagi jamoa a'zolari bilan.",
            "Platformani ishlatishda yordam beradigan xizmat provayderlari (masalan, bulut xostingi, xarita xizmatlari) bilan.",
            "Qonun, qoidalar yoki qonuniy sud jarayoni talab qilganda.",
            "Foydalanuvchilarimiz va jamiyat xavfsizligini himoya qilish uchun.",
          ]}
        />
      </Section>

      <Section icon={Bell} title="5. Bildirishnomalar">
        <p>
          Biz yuk tayinlashlari, holat o'zgarishlari va hisob faoliyati haqida push-bildirishnomalar
          va ilova ichidagi ogohlantirishlar yuborishimiz mumkin. Push-bildirishnomalarni
          yetkazish uchun hisobingiz bilan bog'langan qurilma tokenini to'playmiz va saqlaymiz.
          Bildirishnoma sozlamalarini qurilma sozlamalarida yoki ilova ichida boshqarishingiz
          mumkin.
        </p>
      </Section>

      <Section icon={Smartphone} title="6. Qurilmangizda saqlanadigan ma'lumotlar">
        <p>
          Mobil ilova funksionallik va ishlash uchun ma'lum ma'lumotlarni qurilmangizda
          mahalliy sifatida saqlaydi:
        </p>
        <Ul
          items={[
            "Xavfsiz sessiya boshqaruvi uchun autentifikatsiya va yangilash tokenlari.",
            "Oflayn rejimda kirish uchun keshlangan foydalanuvchi profil ma'lumotlari.",
            "Til va mavzu sozlamalari.",
            "Fonda joylashuvni hisobot qilish uchun faol buyurtma konteksti.",
          ]}
        />
        <p>
          Bu ma'lumotlar qurilmaning xavfsiz mahalliy xotirasidan foydalanib saqlanadi va
          hisobdan chiqqaningizda yoki ilovani o'chirib tashlaganingizda o'chiriladi.
        </p>
      </Section>

      <Section icon={UserCheck} title="7. Ma'lumotlarni saqlash">
        <p>
          Biz shaxsiy ma'lumotlaringizni hisobingiz faol bo'lgan yoki Xizmatlarimizni
          ko'rsatish uchun zarur bo'lgan muddatgacha saqlaymiz. Joylashuvni kuzatish
          ma'lumotlari yetkazib berish operatsiyalari va nizolarni hal qilishni qo'llab-quvvatlash
          uchun zarur muddat davomida saqlanadi. Istalgan vaqtda biz bilan bog'lanib, hisob
          va bog'liq ma'lumotlarni o'chirishni so'rashingiz mumkin. Hisob o'chirilgandan
          so'ng, ma'lumotlar 30 kun ichida o'chiriladi (qonun talab qilgan hollar bundan
          mustasno).
        </p>
      </Section>

      <Section icon={Shield} title="8. Ma'lumotlar xavfsizligi">
        <p>
          Biz shaxsiy ma'lumotlaringizni ruxsatsiz kirish, o'zgartirish, oshkor qilish yoki
          yo'q qilishdan himoya qilish uchun tegishli texnik va tashkiliy choralarni qo'llaymiz:
        </p>
        <Ul
          items={[
            "Ilova va serverlar o'rtasidagi barcha aloqalar uchun ma'lumotlarni shifrlash (HTTPS/TLS).",
            "Avtomatik yangilanishli xavfsiz token asosidagi autentifikatsiya.",
            "Muntazam xavfsizlik tekshiruvlari va kirish nazorati.",
            "Mahalliy ma'lumotlar platformaning xavfsiz saqlash mexanizmlari yordamida saqlanadi.",
          ]}
        />
      </Section>

      <Section icon={Trash2} title="9. Sizning huquqlaringiz">
        <p>Joylashuvingizga qarab, quyidagi huquqlarga ega bo'lishingiz mumkin:</p>
        <Ul
          items={[
            "Biz saqlaydigan shaxsiy ma'lumotlarga kirish.",
            "Noto'g'ri yoki to'liq bo'lmagan ma'lumotlarni to'g'rilash.",
            "Shaxsiy ma'lumotlarni o'chirishni so'rash.",
            "Ma'lum qayta ishlash faoliyatiga e'tiroz bildirish yoki uni cheklash.",
            "Ma'lumotlarni o'tkazish — ularni mashinada o'qiladigan formatda olish.",
            "Qurilma sozlamalari orqali joylashuvni kuzatishga rozilikni istalgan vaqtda bekor qilish.",
          ]}
        />
        <p className="mt-3">
          Ushbu huquqlarni amalga oshirish uchun biz bilan bog'laning:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section icon={Mail} title="10. Bolalar maxfiyligi">
        <p>
          Xizmatlarimiz 13 yoshdan kichik shaxslarga mo'ljallanmagan. Biz bolalardan ataylab
          shaxsiy ma'lumot to'plamaymiz. Agar bola bizga shaxsiy ma'lumot taqdim etganini
          bilsak, biz bunday ma'lumotni o'chirish choralarini ko'ramiz.
        </p>
      </Section>

      <Section icon={Eye} title="11. Ushbu siyosatdagi o'zgarishlar">
        <p>
          Biz vaqti-vaqti bilan ushbu Maxfiylik siyosatini yangilashimiz mumkin. Muhim
          o'zgarishlar haqida ilova ichidagi bildirishnoma yoki elektron pochta orqali xabar
          beramiz. O'zgarishlardan keyin Xizmatlardan foydalanishni davom ettirish yangi
          siyosatni qabul qilganingizni bildiradi.
        </p>
      </Section>

      <Section icon={Mail} title="12. Biz bilan bog'lanish">
        <p>
          Ushbu Maxfiylik siyosati yoki ma'lumot amaliyotlarimiz haqida savollaringiz bo'lsa,
          biz bilan bog'laning:
        </p>
        <p className="mt-2">
          <strong>{COMPANY_NAME}</strong>
          <br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </Layout>
  );
}
