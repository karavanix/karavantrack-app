import { useTranslation } from "react-i18next";
import { Trash2, Smartphone, Mail, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

// Public account-deletion page required by Google Play (the "Delete account
// URL" in Data safety): users must be able to request deletion without
// reinstalling the app.

const CONTACT_EMAIL = "support@yool.live";
const APP_NAME = "YoolLive";
const COMPANY_NAME = "YOOL";

export default function DeleteAccountPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  if (lang === "ru") return <DeleteAccountRu />;
  if (lang === "uz") return <DeleteAccountUz />;
  return <DeleteAccountEn />;
}

/* ───────────────────────── Shared layout ───────────────────────── */

function Layout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25">
                <Trash2 className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {APP_NAME}
              </span>
            </div>
            <LanguageSwitcher />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{title}</h1>
          <p className="text-muted-foreground text-lg">{subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-10">{children}</div>
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

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold shrink-0">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
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

function EmailButton({ label, subject }: { label: string; subject: string }) {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
      className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
    >
      <Mail className="w-4 h-4" />
      {label}
    </a>
  );
}

/* ───────────────────────── English ───────────────────────── */

function DeleteAccountEn() {
  return (
    <Layout
      title="Delete your account"
      subtitle={`How to delete your ${APP_NAME} account and all of its data.`}
    >
      <Section icon={Smartphone} title="Delete in the app">
        <Steps
          items={[
            <>Open the {APP_NAME} app and sign in.</>,
            <>Go to the <strong>Settings</strong> tab.</>,
            <>Tap <strong>Delete Account</strong> and confirm.</>,
          ]}
        />
        <p>Your account is deleted right away and you are signed out.</p>
      </Section>

      <Section icon={Mail} title="Request deletion without the app">
        <p>
          If you no longer have the app installed, send us a request by email from the email
          address of your account. If you sign in with a phone number or Telegram, write that
          phone number or Telegram username in the email.
        </p>
        <EmailButton label="Request account deletion" subject="Account deletion request" />
        <p>
          We will confirm the request and delete your account within 30 days.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="What is deleted">
        <p>When your account is deleted, all of your data is permanently deleted:</p>
        <Ul
          items={[
            "Profile: name, email address, phone number and password.",
            "Sign-in connections (Telegram, Apple).",
            "Location history.",
            "Photos you uploaded.",
            "Devices and push notification tokens.",
          ]}
        />
      </Section>
    </Layout>
  );
}

/* ───────────────────────── Russian ───────────────────────── */

function DeleteAccountRu() {
  return (
    <Layout
      title="Удаление аккаунта"
      subtitle={`Как удалить аккаунт ${APP_NAME} и все его данные.`}
    >
      <Section icon={Smartphone} title="Удаление в приложении">
        <Steps
          items={[
            <>Откройте приложение {APP_NAME} и войдите в аккаунт.</>,
            <>Перейдите на вкладку <strong>Настройки</strong>.</>,
            <>Нажмите <strong>Удалить аккаунт</strong> и подтвердите.</>,
          ]}
        />
        <p>Аккаунт удаляется сразу, и вы выходите из приложения.</p>
      </Section>

      <Section icon={Mail} title="Запрос на удаление без приложения">
        <p>
          Если приложение уже удалено, отправьте нам запрос по электронной почте с адреса,
          привязанного к аккаунту. Если вы входите по номеру телефона или через Telegram,
          укажите в письме этот номер или имя пользователя Telegram.
        </p>
        <EmailButton label="Запросить удаление аккаунта" subject="Запрос на удаление аккаунта" />
        <p>Мы подтвердим запрос и удалим аккаунт в течение 30 дней.</p>
      </Section>

      <Section icon={ShieldCheck} title="Что удаляется">
        <p>При удалении аккаунта все ваши данные удаляются безвозвратно:</p>
        <Ul
          items={[
            "Профиль: имя, адрес электронной почты, номер телефона и пароль.",
            "Привязанные способы входа (Telegram, Apple).",
            "История местоположения.",
            "Загруженные вами фотографии.",
            "Устройства и токены push-уведомлений.",
          ]}
        />
      </Section>
    </Layout>
  );
}

/* ───────────────────────── Uzbek ───────────────────────── */

function DeleteAccountUz() {
  return (
    <Layout
      title="Akkauntni o'chirish"
      subtitle={`${APP_NAME} akkauntini va uning barcha ma'lumotlarini qanday o'chirish mumkin.`}
    >
      <Section icon={Smartphone} title="Ilova ichida o'chirish">
        <Steps
          items={[
            <>{APP_NAME} ilovasini oching va akkauntingizga kiring.</>,
            <><strong>Sozlamalar</strong> bo'limiga o'ting.</>,
            <><strong>Akkauntni o'chirish</strong> tugmasini bosing va tasdiqlang.</>,
          ]}
        />
        <p>Akkaunt darhol o'chiriladi va siz ilovadan chiqasiz.</p>
      </Section>

      <Section icon={Mail} title="Ilovasiz o'chirishni so'rash">
        <p>
          Agar ilova allaqachon o'chirilgan bo'lsa, akkauntga bog'langan elektron pochta
          manzilidan bizga so'rov yuboring. Agar telefon raqami yoki Telegram orqali kirsangiz,
          xatda shu raqamni yoki Telegram foydalanuvchi nomini ko'rsating.
        </p>
        <EmailButton label="Akkauntni o'chirishni so'rash" subject="Akkauntni o'chirish so'rovi" />
        <p>So'rovni tasdiqlaymiz va akkauntni 30 kun ichida o'chiramiz.</p>
      </Section>

      <Section icon={ShieldCheck} title="Nimalar o'chiriladi">
        <p>Akkaunt o'chirilganda barcha ma'lumotlaringiz butunlay o'chiriladi:</p>
        <Ul
          items={[
            "Profil: ism, elektron pochta manzili, telefon raqami va parol.",
            "Bog'langan kirish usullari (Telegram, Apple).",
            "Joylashuv tarixi.",
            "Siz yuklagan fotosuratlar.",
            "Qurilmalar va push-bildirishnoma tokenlari.",
          ]}
        />
      </Section>
    </Layout>
  );
}
