import { useTranslation } from "react-i18next";
import {
  FileText,
  UserCheck,
  ShieldCheck,
  Ban,
  Scale,
  RefreshCw,
  Globe,
  TriangleAlert,
  Mail,
  HandshakeIcon,
  MapPin,
} from "lucide-react";

const EFFECTIVE_DATE = "April 5, 2026";
const CONTACT_EMAIL = "support@yool.live";
const APP_NAME = "YOOL";
const COMPANY_NAME = "YOOL";

export default function TermsOfServicePage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  if (lang === "ru") return <TermsRu />;
  if (lang === "uz") return <TermsUz />;
  return <TermsEn />;
}

/* ───────────────────────── Shared layout ───────────────────────── */

function Layout({ children }: { children: React.ReactNode }) {
  const nodes = Array.isArray(children) ? (children as React.ReactNode[]) : [children];
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              {APP_NAME}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{nodes[0]}</h1>
          <p className="text-muted-foreground text-lg">{nodes[1]}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-10">{nodes.slice(2)}</div>
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

function TermsEn() {
  return (
    <Layout>
      <>Terms of Service</>
      <>Effective date: {EFFECTIVE_DATE}</>

      <Section icon={HandshakeIcon} title="1. Acceptance of Terms">
        <p>
          By accessing, downloading, installing, or using the {APP_NAME} web platform or mobile
          application (collectively, "the Services"), you agree to be bound by these Terms of
          Service ("Terms"). If you do not agree to these Terms, do not use the Services.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you and {COMPANY_NAME}
          ("we", "us", or "our").
        </p>
      </Section>

      <Section icon={FileText} title="2. Description of Service">
        <p>
          {APP_NAME} is a shipment tracking and logistics management platform consisting of:
        </p>
        <Ul
          items={[
            "A web platform for shippers to create and manage loads, assign carriers, and monitor deliveries in real time.",
            "A mobile application for carriers and drivers to receive load assignments, accept deliveries, and provide real-time location tracking during transit.",
          ]}
        />
        <p className="mt-3">The Services provide the following core features:</p>
        <Ul
          items={[
            "Creating, managing, and tracking shipment loads (shippers).",
            "Viewing assigned loads, accepting deliveries, and updating load status (carriers).",
            "Real-time GPS-based location tracking of carriers during active deliveries.",
            "Managing company profiles and team members.",
            "Push notifications and alerts for load status changes and assignments.",
          ]}
        />
      </Section>

      <Section icon={UserCheck} title="3. User Accounts">
        <p>
          To use {APP_NAME}, you must create an account and select your role (shipper or carrier).
          You agree to provide accurate, current, and complete information during registration and
          to keep your account information updated.
        </p>
        <Ul
          items={[
            "You are responsible for maintaining the confidentiality of your login credentials.",
            "You are responsible for all activities that occur under your account.",
            "You must notify us immediately of any unauthorized use of your account.",
            "You may not share your account credentials with any third party.",
            "You must be at least 18 years of age to create an account.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="4. Location Tracking and Consent">
        <p>
          <strong>This section applies to carriers and drivers using the {APP_NAME} mobile
          application.</strong>
        </p>
        <p>
          By accepting a delivery through the app, you consent to continuous collection of your
          GPS location data (including latitude, longitude, speed, heading, and accuracy) for the
          duration of the delivery. This data is shared with the shipper in real time.
        </p>
        <p>
          The app uses a foreground service to track your location even when the app is in the
          background or the screen is off. A persistent notification is displayed while tracking
          is active. Location tracking stops automatically when the delivery is completed,
          cancelled, or when you log out.
        </p>
        <p>
          Granting location permission (including background location access) is required to use
          the carrier features of the app. If you revoke location permissions, you will not be
          able to accept or complete deliveries.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="5. Acceptable Use">
        <p>
          You agree to use the Services only for lawful purposes and in accordance with these
          Terms. You agree not to:
        </p>
        <Ul
          items={[
            "Use the Services to engage in any illegal activity or facilitate illegal transactions.",
            "Submit false, misleading, or fraudulent shipment, company, or personal information.",
            "Attempt to gain unauthorized access to any part of the Services or their related systems.",
            "Interfere with or disrupt the integrity or performance of the Services.",
            "Use automated scripts or bots to interact with the Services without our written consent.",
            "Impersonate any person or entity, or misrepresent your affiliation with any person or entity.",
            "Manipulate or falsify GPS location data transmitted through the mobile application.",
          ]}
        />
      </Section>

      <Section icon={Ban} title="6. Prohibited Activities">
        <p>The following activities are strictly prohibited:</p>
        <Ul
          items={[
            "Using the platform to arrange transport of illegal goods or substances.",
            "Posting inaccurate load information to deceive carriers or shippers.",
            "Using GPS spoofing or location-faking tools while using the mobile application.",
            "Attempting to reverse engineer, decompile, or disassemble the Services.",
            "Circumventing any access control or security mechanism.",
            "Reselling or sublicensing access to the Services without authorization.",
          ]}
        />
      </Section>

      <Section icon={TriangleAlert} title="7. Disclaimer of Warranties">
        <p>
          The Services are provided on an "as is" and "as available" basis without warranties of
          any kind, either express or implied, including but not limited to:
        </p>
        <Ul
          items={[
            "Warranties of merchantability or fitness for a particular purpose.",
            "Warranties that the Services will be uninterrupted, error-free, or secure.",
            "Warranties regarding the accuracy or completeness of any content.",
            "Warranties regarding the accuracy of GPS location data or real-time tracking.",
          ]}
        />
        <p className="mt-2">
          We do not guarantee the reliability of third-party map data, geocoding services, GPS
          hardware, or carrier/shipper information provided through the Services.
        </p>
      </Section>

      <Section icon={Scale} title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, {COMPANY_NAME} shall not be liable
          for any indirect, incidental, special, consequential, or punitive damages arising from
          your use of or inability to use the Services, including but not limited to:
        </p>
        <Ul
          items={[
            "Loss of revenue, profits, or business opportunities.",
            "Loss or corruption of data.",
            "Delays or failures in transportation or logistics operations.",
            "Acts or omissions of carriers, drivers, shippers, or third parties.",
            "Inaccuracies in GPS tracking or location reporting.",
          ]}
        />
      </Section>

      <Section icon={Globe} title="9. Intellectual Property">
        <p>
          All content, features, and functionality of the Services — including but not limited to
          text, graphics, logos, icons, and software — are the exclusive property of{" "}
          {COMPANY_NAME} and are protected by applicable intellectual property laws.
        </p>
        <p>
          You may not copy, reproduce, modify, distribute, or create derivative works of any part
          of the Services without our prior written consent.
        </p>
      </Section>

      <Section icon={RefreshCw} title="10. Modifications to the Service">
        <p>
          We reserve the right to modify, suspend, or discontinue any part of the Services at any
          time, with or without notice. We may also update these Terms periodically. Continued use
          of the Services after any changes constitutes your acceptance of the updated Terms.
        </p>
        <p>
          We will make reasonable efforts to notify users of significant changes via in-app
          notifications or email.
        </p>
      </Section>

      <Section icon={Scale} title="11. Governing Law">
        <p>
          These Terms are governed by and construed in accordance with applicable laws. Any
          disputes arising under or in connection with these Terms shall be subject to the
          exclusive jurisdiction of the competent courts.
        </p>
      </Section>

      <Section icon={Mail} title="12. Contact Us">
        <p>
          If you have any questions about these Terms of Service, please contact us at:
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

function TermsRu() {
  return (
    <Layout>
      <>Условия использования</>
      <>Дата вступления в силу: {EFFECTIVE_DATE}</>

      <Section icon={HandshakeIcon} title="1. Принятие условий">
        <p>
          Получая доступ, загружая, устанавливая или используя веб-платформу или мобильное
          приложение {APP_NAME} (совместно — «Сервисы»), вы соглашаетесь соблюдать настоящие
          Условия использования («Условия»). Если вы не согласны с настоящими Условиями, не
          используйте Сервисы.
        </p>
        <p>
          Настоящие Условия являются юридически обязывающим соглашением между вами и{" "}
          {COMPANY_NAME} («мы», «нас» или «наш»).
        </p>
      </Section>

      <Section icon={FileText} title="2. Описание сервиса">
        <p>
          {APP_NAME} — платформа для отслеживания грузов и управления логистикой, состоящая из:
        </p>
        <Ul
          items={[
            "Веб-платформы для грузоотправителей для создания и управления грузами, назначения перевозчиков и мониторинга доставок в реальном времени.",
            "Мобильного приложения для перевозчиков и водителей для получения назначений, принятия доставок и отслеживания местоположения в реальном времени.",
          ]}
        />
        <p className="mt-3">Сервисы предоставляют следующие основные функции:</p>
        <Ul
          items={[
            "Создание, управление и отслеживание грузовых заказов (грузоотправители).",
            "Просмотр назначенных грузов, принятие доставок и обновление статуса (перевозчики).",
            "GPS-отслеживание перевозчиков в реальном времени во время активных доставок.",
            "Управление профилями компаний и членами команды.",
            "Push-уведомления об изменениях статуса грузов и назначениях.",
          ]}
        />
      </Section>

      <Section icon={UserCheck} title="3. Учётные записи пользователей">
        <p>
          Для использования {APP_NAME} необходимо создать учётную запись и выбрать свою роль
          (грузоотправитель или перевозчик). Вы обязуетесь предоставлять точную, актуальную и
          полную информацию при регистрации и поддерживать её в актуальном состоянии.
        </p>
        <Ul
          items={[
            "Вы несёте ответственность за сохранность ваших учётных данных.",
            "Вы несёте ответственность за все действия, совершённые под вашей учётной записью.",
            "Вы должны немедленно уведомить нас о любом несанкционированном использовании вашей учётной записи.",
            "Вы не вправе передавать данные учётной записи третьим лицам.",
            "Вам должно быть не менее 18 лет для создания учётной записи.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="4. Отслеживание местоположения и согласие">
        <p>
          <strong>Этот раздел относится к перевозчикам и водителям, использующим мобильное
          приложение {APP_NAME}.</strong>
        </p>
        <p>
          Принимая доставку через приложение, вы даёте согласие на непрерывный сбор ваших
          GPS-данных (включая широту, долготу, скорость, направление и точность) на протяжении
          всей доставки. Эти данные передаются грузоотправителю в реальном времени.
        </p>
        <p>
          Приложение использует foreground-сервис для отслеживания вашего местоположения, даже
          когда приложение свёрнуто или экран выключен. Постоянное уведомление отображается,
          пока отслеживание активно. Отслеживание прекращается автоматически при завершении
          или отмене доставки, или при выходе из аккаунта.
        </p>
        <p>
          Предоставление разрешения на доступ к местоположению (включая фоновый доступ) является
          обязательным для использования функций перевозчика. При отзыве разрешений вы не
          сможете принимать и выполнять доставки.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="5. Допустимое использование">
        <p>
          Вы соглашаетесь использовать Сервисы только в законных целях и в соответствии с
          настоящими Условиями. Вы обязуетесь не:
        </p>
        <Ul
          items={[
            "Использовать Сервисы для незаконной деятельности или содействия в ней.",
            "Предоставлять ложную, вводящую в заблуждение или мошенническую информацию о грузах, компании или персональных данных.",
            "Пытаться получить несанкционированный доступ к Сервисам или связанным системам.",
            "Вмешиваться в работу или целостность Сервисов.",
            "Использовать автоматические скрипты или боты без нашего письменного согласия.",
            "Выдавать себя за другое лицо или организацию.",
            "Подделывать или фальсифицировать GPS-данные, передаваемые через мобильное приложение.",
          ]}
        />
      </Section>

      <Section icon={Ban} title="6. Запрещённые действия">
        <p>Следующие действия строго запрещены:</p>
        <Ul
          items={[
            "Использование платформы для организации перевозки незаконных товаров или веществ.",
            "Публикация недостоверной информации о грузах с целью введения перевозчиков или грузоотправителей в заблуждение.",
            "Использование GPS-подмены или инструментов фальсификации местоположения при работе с мобильным приложением.",
            "Попытки реверс-инжиниринга, декомпиляции или дизассемблирования Сервисов.",
            "Обход средств контроля доступа или механизмов безопасности.",
            "Перепродажа или сублицензирование доступа к Сервисам без разрешения.",
          ]}
        />
      </Section>

      <Section icon={TriangleAlert} title="7. Отказ от гарантий">
        <p>
          Сервисы предоставляются «как есть» и «по мере наличия» без каких-либо гарантий, явных
          или подразумеваемых, включая, но не ограничиваясь:
        </p>
        <Ul
          items={[
            "Гарантиями товарной пригодности или пригодности для определённой цели.",
            "Гарантиями бесперебойной, безошибочной или защищённой работы Сервисов.",
            "Гарантиями точности или полноты любого контента.",
            "Гарантиями точности GPS-данных или отслеживания в реальном времени.",
          ]}
        />
        <p className="mt-2">
          Мы не гарантируем надёжность данных карт, геокодирования, GPS-оборудования или
          информации о перевозчиках/грузоотправителях, предоставляемых через Сервисы.
        </p>
      </Section>

      <Section icon={Scale} title="8. Ограничение ответственности">
        <p>
          В максимально допустимой степени, разрешённой применимым законодательством,{" "}
          {COMPANY_NAME} не несёт ответственности за любые косвенные, случайные, особые,
          последующие или штрафные убытки, возникшие в результате использования или невозможности
          использования Сервисов, включая:
        </p>
        <Ul
          items={[
            "Потерю дохода, прибыли или деловых возможностей.",
            "Потерю или повреждение данных.",
            "Задержки или сбои в транспортных или логистических операциях.",
            "Действия или бездействие перевозчиков, водителей, грузоотправителей или третьих лиц.",
            "Неточности в GPS-отслеживании или отчётности о местоположении.",
          ]}
        />
      </Section>

      <Section icon={Globe} title="9. Интеллектуальная собственность">
        <p>
          Весь контент, функции и функциональность Сервисов — включая, но не ограничиваясь
          текстом, графикой, логотипами, значками и программным обеспечением — являются
          исключительной собственностью {COMPANY_NAME} и защищены применимым законодательством
          об интеллектуальной собственности.
        </p>
        <p>
          Вы не вправе копировать, воспроизводить, изменять, распространять или создавать
          производные работы на основе любой части Сервисов без нашего предварительного
          письменного согласия.
        </p>
      </Section>

      <Section icon={RefreshCw} title="10. Изменения сервиса">
        <p>
          Мы оставляем за собой право изменять, приостанавливать или прекращать работу любой
          части Сервисов в любое время с предварительным уведомлением или без него. Мы также
          можем периодически обновлять настоящие Условия. Продолжение использования Сервисов
          после внесения изменений означает ваше согласие с обновлёнными Условиями.
        </p>
        <p>
          Мы приложим разумные усилия для уведомления пользователей о существенных изменениях
          через уведомления в приложении или по электронной почте.
        </p>
      </Section>

      <Section icon={Scale} title="11. Применимое право">
        <p>
          Настоящие Условия регулируются и толкуются в соответствии с применимым законодательством.
          Все споры, возникающие в связи с настоящими Условиями, подлежат рассмотрению в
          компетентных судах.
        </p>
      </Section>

      <Section icon={Mail} title="12. Свяжитесь с нами">
        <p>
          Если у вас есть вопросы по настоящим Условиям использования, свяжитесь с нами:
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

function TermsUz() {
  return (
    <Layout>
      <>Foydalanish shartlari</>
      <>Kuchga kirish sanasi: {EFFECTIVE_DATE}</>

      <Section icon={HandshakeIcon} title="1. Shartlarni qabul qilish">
        <p>
          {APP_NAME} veb-platformasiga yoki mobil ilovasiga (birgalikda — "Xizmatlar") kirish,
          yuklab olish, o'rnatish yoki foydalanish orqali siz ushbu Foydalanish shartlariga
          ("Shartlar") rozilik bildirasiz. Agar siz ushbu Shartlarga rozi bo'lmasangiz,
          Xizmatlardan foydalanmang.
        </p>
        <p>
          Ushbu Shartlar siz va {COMPANY_NAME} ("biz", "bizni" yoki "bizning") o'rtasidagi
          yuridik jihatdan majburiy kelishuvdir.
        </p>
      </Section>

      <Section icon={FileText} title="2. Xizmat tavsifi">
        <p>
          {APP_NAME} — yuk kuzatuvi va logistika boshqaruvi platformasi bo'lib, quyidagilardan
          iborat:
        </p>
        <Ul
          items={[
            "Yuk jo'natuvchilar uchun yuklar yaratish, boshqarish, tashuvchilarni tayinlash va yetkazib berishni real vaqtda kuzatish imkonini beruvchi veb-platforma.",
            "Tashuvchilar va haydovchilar uchun tayinlashlarni qabul qilish, yetkazib berishni boshlash va tranzit davomida real vaqtda joylashuvni kuzatishni ta'minlovchi mobil ilova.",
          ]}
        />
        <p className="mt-3">Xizmatlar quyidagi asosiy funksiyalarni taqdim etadi:</p>
        <Ul
          items={[
            "Yuk buyurtmalarini yaratish, boshqarish va kuzatish (yuk jo'natuvchilar).",
            "Tayinlangan yuklarni ko'rish, yetkazib berishni qabul qilish va holat yangilash (tashuvchilar).",
            "Faol yetkazib berish davomida tashuvchilarni real vaqtda GPS orqali kuzatish.",
            "Kompaniya profillari va jamoa a'zolarini boshqarish.",
            "Yuk holati o'zgarishlari va tayinlashlar haqida push-bildirishnomalar.",
          ]}
        />
      </Section>

      <Section icon={UserCheck} title="3. Foydalanuvchi hisoblari">
        <p>
          {APP_NAME} dan foydalanish uchun hisob yaratishingiz va rolingizni tanlashingiz kerak
          (yuk jo'natuvchi yoki tashuvchi). Siz ro'yxatdan o'tish paytida to'g'ri, dolzarb va
          to'liq ma'lumot berishga va hisob ma'lumotlaringizni yangilab turishga rozilik bildirasiz.
        </p>
        <Ul
          items={[
            "Siz kirish ma'lumotlaringizning maxfiyligini saqlash uchun javobgarsiz.",
            "Siz hisobingiz ostida amalga oshirilgan barcha harakatlar uchun javobgarsiz.",
            "Hisobingizdan ruxsatsiz foydalanilgan taqdirda darhol bizga xabar berishingiz kerak.",
            "Hisob ma'lumotlarini uchinchi shaxslarga bermang.",
            "Hisob yaratish uchun kamida 18 yoshda bo'lishingiz kerak.",
          ]}
        />
      </Section>

      <Section icon={MapPin} title="4. Joylashuvni kuzatish va rozilik">
        <p>
          <strong>Ushbu bo'lim {APP_NAME} mobil ilovasidan foydalanuvchi tashuvchilar va
          haydovchilarga tegishli.</strong>
        </p>
        <p>
          Ilova orqali yetkazib berishni qabul qilish bilan siz GPS joylashuv ma'lumotlaringizni
          (kenglik, uzunlik, tezlik, yo'nalish va aniqlikni o'z ichiga olgan holda) yetkazib berish
          davomida uzluksiz to'plashga rozilik bildirasiz. Bu ma'lumotlar real vaqtda yuk
          jo'natuvchi bilan ulashiladi.
        </p>
        <p>
          Ilova foreground-xizmatdan foydalanib, ilova yopilgan yoki ekran o'chirilgan bo'lsa ham
          joylashuvingizni kuzatadi. Kuzatuv faol bo'lganida doimiy bildirishnoma ko'rsatiladi.
          Joylashuvni kuzatish yetkazib berish tugallanganda, bekor qilinganda yoki hisobdan
          chiqqaningizda avtomatik to'xtaydi.
        </p>
        <p>
          Joylashuvga ruxsat berish (shu jumladan fonda joylashuvga kirish) tashuvchi
          funksiyalaridan foydalanish uchun majburiydir. Joylashuv ruxsatlarini bekor qilsangiz,
          yetkazib berishni qabul qilish yoki bajarish imkoniyati bo'lmaydi.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="5. Ruxsat etilgan foydalanish">
        <p>
          Siz Xizmatlardan faqat qonuniy maqsadlarda va ushbu Shartlarga muvofiq foydalanishga
          rozilik bildirasiz. Siz quyidagilarni qilmaslikka rozilik bildirasiz:
        </p>
        <Ul
          items={[
            "Xizmatlardan noqonuniy faoliyat uchun foydalanish.",
            "Yuk, kompaniya yoki shaxsiy ma'lumotlar haqida noto'g'ri, chalg'ituvchi yoki firibgar ma'lumot taqdim etish.",
            "Xizmatlar yoki ularga bog'liq tizimlarga ruxsatsiz kirishga urinish.",
            "Xizmatlarning ishlashiga yoki yaxlitligiga xalaqit berish.",
            "Yozma roziligimiz bo'lmasa avtomatlashtirilgan skriptlar yoki botlardan foydalanish.",
            "Boshqa shaxs yoki tashkilotni taqlid qilish.",
            "Mobil ilova orqali uzatiladigan GPS joylashuv ma'lumotlarini manipulyatsiya qilish yoki soxtalashtirish.",
          ]}
        />
      </Section>

      <Section icon={Ban} title="6. Taqiqlangan faoliyat">
        <p>Quyidagi harakatlar qat'iyan taqiqlanadi:</p>
        <Ul
          items={[
            "Platformadan noqonuniy tovarlar yoki moddalarni tashishni tashkil qilish uchun foydalanish.",
            "Tashuvchilar yoki yuk jo'natuvchilarni aldash maqsadida noto'g'ri yuk ma'lumotlarini joylashtirish.",
            "Mobil ilovadan foydalanayotganda GPS-spoofing yoki joylashuvni soxtalashtirish vositalaridan foydalanish.",
            "Xizmatlarni qayta muhandislik qilish, dekompilatsiya qilish yoki parchalashga urinish.",
            "Kirish nazorati yoki xavfsizlik mexanizmlarini chetlab o'tish.",
            "Ruxsatsiz Xizmatlarga kirishni qayta sotish yoki sublitsenziyalash.",
          ]}
        />
      </Section>

      <Section icon={TriangleAlert} title="7. Kafolatlardan voz kechish">
        <p>
          Xizmatlar hech qanday kafolatlarsiz, aniq yoki nazarda tutilgan, shu jumladan
          quyidagilar bilan cheklanmagan holda "mavjud holda" taqdim etiladi:
        </p>
        <Ul
          items={[
            "Savdoga yaroqlilik yoki ma'lum bir maqsad uchun moslik kafolatlari.",
            "Xizmatlarning uzluksiz, xatosiz yoki xavfsiz ishlashi kafolatlari.",
            "Har qanday kontentning aniqligi yoki to'liqligi kafolatlari.",
            "GPS joylashuv ma'lumotlari yoki real vaqtda kuzatuvning aniqligi kafolatlari.",
          ]}
        />
        <p className="mt-2">
          Biz Xizmatlar orqali taqdim etiladigan uchinchi tomon xarita ma'lumotlari, geokodlash
          xizmatlari, GPS uskunalari yoki tashuvchi/yuk jo'natuvchi ma'lumotlarining
          ishonchliligini kafolatlamaymiz.
        </p>
      </Section>

      <Section icon={Scale} title="8. Javobgarlikni cheklash">
        <p>
          Amaldagi qonunchilik ruxsat etgan maksimal darajada, {COMPANY_NAME} Xizmatlardan
          foydalanish yoki foydalana olmaslik natijasida yuzaga keladigan bilvosita, tasodifiy,
          maxsus, oqibatli yoki jazo zararlar uchun javobgar bo'lmaydi, jumladan:
        </p>
        <Ul
          items={[
            "Daromad, foyda yoki biznes imkoniyatlarini yo'qotish.",
            "Ma'lumotlarni yo'qotish yoki buzilish.",
            "Transport yoki logistika operatsiyalaridagi kechikishlar yoki muvaffaqiyatsizliklar.",
            "Tashuvchilar, haydovchilar, yuk jo'natuvchilar yoki uchinchi shaxslarning harakatlari yoki harakatsizligi.",
            "GPS kuzatuvi yoki joylashuv hisobotidagi noaniqliklar.",
          ]}
        />
      </Section>

      <Section icon={Globe} title="9. Intellektual mulk">
        <p>
          Xizmatlarning barcha kontenti, xususiyatlari va funksionalligi — matn, grafika,
          logotiplar, ikonlar va dasturiy ta'minot bilan cheklanmagan holda — {COMPANY_NAME}ning
          eksklyuziv mulki bo'lib, amaldagi intellektual mulk qonunlari bilan himoyalangan.
        </p>
        <p>
          Siz oldindan yozma roziligimiz bo'lmasa Xizmatlarning biron bir qismini nusxalash,
          qayta ishlab chiqarish, o'zgartirish, tarqatish yoki hosilalarini yaratish huquqiga
          ega emassiz.
        </p>
      </Section>

      <Section icon={RefreshCw} title="10. Xizmatni o'zgartirish">
        <p>
          Biz xabardor qilgan yoki qilmagan holda Xizmatlarning istalgan qismini istalgan
          vaqtda o'zgartirish, to'xtatib qo'yish yoki tugatish huquqini o'zimizda saqlaymiz.
          Biz shuningdek ushbu Shartlarni vaqti-vaqti bilan yangilashimiz mumkin.
          O'zgarishlardan keyin Xizmatlardan foydalanishni davom ettirish yangilangan Shartlarni
          qabul qilganingizni bildiradi.
        </p>
        <p>
          Muhim o'zgarishlar haqida foydalanuvchilarga ilova ichidagi bildirishnomalar yoki
          elektron pochta orqali xabar berish uchun oqilona harakat qilamiz.
        </p>
      </Section>

      <Section icon={Scale} title="11. Amaldagi qonunchilik">
        <p>
          Ushbu Shartlar amaldagi qonunchilikka muvofiq boshqariladi va talqin qilinadi. Ushbu
          Shartlar bilan bog'liq barcha nizolar vakolatli sudlar tomonidan ko'rib chiqiladi.
        </p>
      </Section>

      <Section icon={Mail} title="12. Biz bilan bog'lanish">
        <p>Ushbu Foydalanish shartlari haqida savollaringiz bo'lsa, biz bilan bog'laning:</p>
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
