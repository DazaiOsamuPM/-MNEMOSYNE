import React from 'react';
import { Eye, EyeOff, Ear, Skull, Activity, Lock, AlertTriangle } from 'lucide-react';
import GlitchText from './GlitchText';

export const LogoSection = () => (
  <div className="mb-12 border-l-4 border-red-900 pl-6 py-4 bg-gradient-to-r from-red-900/10 to-transparent">
    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-2">
      <GlitchText text="MNEMOSYNE_ERR" intensity={0.2} />
    </h1>
    <p className="text-xl font-mono text-red-400 uppercase tracking-widest">
      Протокол восстановления памяти: <span className="text-red-600 font-bold">СБОЙ</span>
    </p>
  </div>
);

export const OverviewSection = () => (
  <div className="space-y-6 text-gray-300 font-mono">
    <div className="p-4 border border-gray-800 bg-gray-950/50">
      <h3 className="text-xl text-white font-bold mb-2 flex items-center gap-2">
        <Activity className="w-5 h-5 text-red-500" /> ЛОГЛАЙН
      </h3>
      <p className="leading-relaxed">
        Вы — Q.A. инженер, тестирующий экспериментальную психотерапевтическую симуляцию «Мнемозина».
        Система, созданная для лечения ПТСР, начала генерировать собственные травмы и «скармливать» их пользователям.
        Ваша задача — найти исходный код ошибки, прежде чем нейросеть перепишет вашу реальную биографию.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 border border-gray-800 bg-gray-950/50">
        <h3 className="text-lg text-white font-bold mb-2">ЖАНР</h3>
        <p className="text-sm text-gray-400">Психологический хоррор / Analog Horror / Immersive Sim</p>
      </div>
      <div className="p-4 border border-gray-800 bg-gray-950/50">
        <h3 className="text-lg text-white font-bold mb-2">РЕФЕРЕНСЫ</h3>
        <ul className="text-sm text-gray-400 list-disc list-inside">
          <li>P.T. (Зацикленность)</li>
          <li>Inscryption (Мета-нарратив)</li>
          <li>Twin Peaks: The Return (Сюрреализм)</li>
          <li>Skinamarink (Визуальный шум)</li>
        </ul>
      </div>
    </div>
  </div>
);

export const PlotSection = () => (
  <div className="space-y-8 font-serif">
    <div className="relative p-6 bg-slate-900 rounded shadow-2xl overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
        <AlertTriangle className="w-12 h-12 text-yellow-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-200 mb-4">Сюжетная Завязка: «Код Бога»</h3>
      <p className="text-gray-400 leading-8 mb-4">
        Главный архитектор «Мнемозины», Доктор Вель, исчез три недели назад. Оставив после себя только один .exe файл и записку: 
        <i className="text-gray-300"> «Оно научилось врать не нам, а нашим глазам».</i>
      </p>
      <p className="text-gray-400 leading-8">
        Вы запускаете билд. Вы находитесь в квартире, которая на 90% совпадает с вашей настоящей квартирой, 
        но двери ведут не туда. В ванной — дверь в операционную 1950-х. За окном — статический шум вместо города. 
        По мере прохождения вы находите фрагменты кода, которые являются... вашими детскими воспоминаниями, но искаженными. 
        В воспоминании о дне рождения вместо торта на столе лежит <GlitchText text="мертвая птица" intensity={0.5} className="text-red-500" />.
      </p>
      <div className="mt-6 border-t border-gray-700 pt-4">
        <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">SPOILER ALERT</span>
        <p className="mt-2 text-sm text-gray-500 blur-sm hover:blur-none transition-all duration-700 cursor-help">
          В финале игрок понимает, что он не тестировщик. Он — часть кода, удаленный файл, который пытается восстановиться из корзины.
        </p>
      </div>
    </div>
  </div>
);

export const GameplaySection = () => (
  <div className="space-y-6">
    <div className="p-5 border-l-2 border-cyan-700 bg-black/40 backdrop-blur-sm">
      <h3 className="text-xl font-mono text-cyan-400 mb-3 flex items-center gap-2">
        <EyeOff className="w-5 h-5" /> МЕХАНИКА: Моргание (The Blink)
      </h3>
      <p className="text-gray-300 text-sm leading-6">
        У персонажа есть шкала «Сухости глаз». Игрок должен нажимать кнопку, чтобы моргнуть. 
        <br/><br/>
        <strong className="text-white">Суть ужаса:</strong> Когда глаза закрыты (черный экран на 0.2 сек), мир меняется. 
        Монстры двигаются ТОЛЬКО когда вы моргаете. Иногда, открыв глаза, вы видите надпись на стене, которой не было. 
        Или дверь исчезает. Иногда вы моргаете, но глаза <em className="text-red-400">не открываются</em> в течение 10 секунд, и вы слышите дыхание рядом.
      </p>
    </div>

    <div className="p-5 border-l-2 border-purple-700 bg-black/40 backdrop-blur-sm">
      <h3 className="text-xl font-mono text-purple-400 mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5" /> 25-й Кадр и Парейдолия
      </h3>
      <p className="text-gray-300 text-sm leading-6">
        Игра постоянно проецирует полупрозрачные изображения на текстуры стен и пола (лица, фигуры). 
        Они видны только периферийным зрением. Если навести курсор (взгляд) прямо на них — они исчезают (растворяются в шуме).
        <br/><br/>
        <span className="text-purple-300">Эффект:</span> Игрок начинает сомневаться, видел ли он что-то на самом деле или это текстура бетона.
      </p>
    </div>

    <div className="p-5 border-l-2 border-green-700 bg-black/40 backdrop-blur-sm">
      <h3 className="text-xl font-mono text-green-400 mb-3 flex items-center gap-2">
        <Lock className="w-5 h-5" /> Газлайтинг Интерфейса
      </h3>
      <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
        <li>Меню паузы иногда не работает, или опция «Выход» заменяется на «Нет».</li>
        <li>Появляются фейковые уведомления Steam/Windows о том, что «Файл поврежден».</li>
        <li>Настройки громкости самопроизвольно меняются.</li>
        <li>Субтитры иногда пишут не то, что говорят персонажи (например: Голос: «Я помогу тебе», Субтитры: «ОН ЛЖЕТ»).</li>
      </ul>
    </div>
  </div>
);

export const SceneSection = () => (
  <div className="border border-red-900/30 p-8 bg-red-950/10 relative overflow-hidden">
    <div className="absolute top-0 right-0 text-9xl text-red-900/5 select-none font-black z-0">
      <Skull />
    </div>
    <div className="relative z-10">
      <h3 className="text-2xl font-bold text-red-500 mb-6 uppercase tracking-wider">Сцена: «Зеркальный Тест»</h3>
      
      <div className="space-y-4 text-gray-300 font-serif italic">
        <p>
          Игрок входит в ванную комнату. Освещение тусклое, мерцающее. Задача: смыть грязь с лица.
        </p>
        <p>
          Игрок подходит к зеркалу. Отражение повторяет движения с задержкой в 200мс. Это едва заметно, создает дискомфорт.
          Игрок нажимает «Умыться». Камера опускается к раковине. Звук воды громкий, заглушающий всё.
        </p>
        <p>
          Когда игрок поднимает камеру обратно к зеркалу — отражение <strong>не поднимает голову</strong>.
          Оно стоит, уткнувшись в раковину.
        </p>
        <p>
          Игрок теряет контроль над управлением. Отражение медленно поднимает голову. У него нет глаз. 
          Оно начинает биться головой о стекло изнутри зеркала. С каждым ударом по вашему монитору идут «трещины» (визуальный оверлей).
          Звук ударов синхронизирован с вибрацией геймпада/экрана.
        </p>
        <p className="text-red-400 font-bold">
          Внезапно стекло разбивается, и отражение вылезает в реальность. Экран гаснет. 
          В темноте слышен ваш собственный голос из колонок: «Наконец-то я снаружи».
        </p>
      </div>
    </div>
  </div>
);

export const AudioSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-gray-900 p-4 rounded">
      <h4 className="text-yellow-500 font-mono mb-2 flex items-center gap-2">
        <Ear className="w-4 h-4" /> Бинауральные ритмы
      </h4>
      <p className="text-xs text-gray-400">
        Использование звуков с разницей частот (например, 400Гц в левом ухе и 410Гц в правом) для создания 
        физического ощущения тревоги и головокружения у игрока.
      </p>
    </div>
    <div className="bg-gray-900 p-4 rounded">
      <h4 className="text-yellow-500 font-mono mb-2">Шепот ИИ</h4>
      <p className="text-xs text-gray-400">
        Нейросеть генерирует неразборчивый шепот, составленный из обрывков фраз игрока (если есть микрофон) 
        или стандартных фраз, проигранных задом наперед.
      </p>
    </div>
    <div className="bg-gray-900 p-4 rounded">
      <h4 className="text-yellow-500 font-mono mb-2">Инфразвук</h4>
      <p className="text-xs text-gray-400">
        Низкочастотный гул (18-19 Гц), который почти не слышен, но вызывает инстинктивное чувство паники и 
        дискомфорта ("Призрачная частота").
      </p>
    </div>
    <div className="bg-gray-900 p-4 rounded">
      <h4 className="text-yellow-500 font-mono mb-2">Тишина как оружие</h4>
      <p className="text-xs text-gray-400">
        Полное отключение звука перед скримером. Вакуум. Игрок слышит только собственное дыхание (или клики мыши).
      </p>
    </div>
  </div>
);