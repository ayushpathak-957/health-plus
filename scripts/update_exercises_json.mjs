import fs from 'node:fs';

const path = 'public/assets/desk-break/exercises.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Add categories if not present
const newCategories = [
  { id: 'aerobic', he: 'אירובי', en: 'Aerobic Exercises' },
  { id: 'holds', he: 'החזקות סטטיות', en: 'Holds' }
];

for (const nc of newCategories) {
  const existingIdx = data.categories.findIndex(c => c.id === nc.id);
  if (existingIdx === -1) {
    data.categories.unshift(nc);
  } else {
    data.categories[existingIdx] = nc;
  }
}

// 2. Add / update exercises
const newExercises = [
  {
    id: 'jumping-jacks',
    he: 'קפיצות פיסוק (מלא)',
    en: 'Jumping jacks',
    amount: '20 פעמים',
    amount_en: '20 reps',
    steps: [
      'עמידה זקופה, רגליים צמודות וידיים לצידי הגוף.',
      'קופצים תוך פריסת רגליים לצדדים והרמת ידיים מעל הראש עד למגע.',
      'קופצים חזרה ומחזירים את הרגליים והידיים לעמדת המוצא.',
      '!נחתו ברכות על כריות כפות הרגליים עם ברכיים מעט כפופות.'
    ],
    steps_en: [
      'Stand upright with your feet together and arms relaxed at your sides.',
      'Jump up, spreading your feet wide while swinging your arms outward and touching your hands overhead.',
      'Quickly jump back to the center, bringing your feet together and returning your arms to your sides.',
      '!Land softly on the balls of your feet with your knees slightly bent to absorb impact.'
    ],
    category: 'aerobic',
    duration: 1,
    keyTimes: [0, 0.5]
  },
  {
    id: 'push-up',
    he: 'שכיבות סמיכה',
    en: 'Push-up',
    amount: '15 פעמים',
    amount_en: '15 reps',
    steps: [
      'מתחילים בעמדת פלאנק גבוהה, כפות ידיים מעט רחבות מרוחב הכתפיים.',
      'שומרים על הגוף בקו ישר וחזק מהראש ועד העקבים.',
      'מורידים את החזה אל עבר הרצפה עד שהמרפקים מגיעים ל-90 מעלות.',
      'דוחפים בחוזקה את הרצפה וחוזרים לעמדת המוצא.',
      '!הימנעו מקריסת הגב התחתון או הרמת הישבן גבוה מדי.'
    ],
    steps_en: [
      'Start in a high plank position with hands slightly wider than shoulder-width.',
      'Keep your body in a straight, rigid line from head to heels.',
      'Lower your chest toward the floor until your elbows bend to about 90 degrees.',
      'Press firmly through the floor to return to the starting plank position.',
      '!Avoid sagging your lower back or lifting your hips too high.'
    ],
    category: 'aerobic',
    view: 'floor',
    duration: 2,
    keyTimes: [0, 1.0]
  },
  {
    id: 'squat',
    he: 'סקוואט',
    en: 'Squat',
    amount: '20 פעמים',
    amount_en: '20 reps',
    steps: [
      'עומדים בפיסוק ברוחב הכתפיים, בהונות פונות מעט החוצה.',
      'מובילים את האגן לאחור ומכופפים ברכיים כאילו מתיישבים על כיסא.',
      'מושיטים ידיים קדימה לאיזון ויורדים עד שהירכיים מקבילות לרצפה.',
      'דוחפים דרך העקבים כדי לעלות חזרה לעמידה זקופה.',
      '!שמרו על חזה מורם וודאו שהברכיים נעות בכיוון הבהונות.'
    ],
    steps_en: [
      'Stand with feet shoulder-width apart, toes pointing slightly outward.',
      'Hinge at your hips and bend your knees to lower your hips down and back.',
      'Reach your arms forward for balance and lower until your thighs are parallel to the floor.',
      'Drive through your heels to stand back up tall.',
      '!Keep your chest lifted and ensure your knees track in line with your toes.'
    ],
    category: 'aerobic',
    duration: 2.2,
    keyTimes: [0, 1.1]
  },
  {
    id: 'lunges',
    he: 'מכרעים (לאנג׳ים)',
    en: 'Lunges',
    amount: '20 פעמים',
    amount_en: '20 reps',
    steps: [
      'עמידה זקופה, כפות רגליים ברוחב האגן.',
      'פוסעים צעד רחב קדימה ומורידים את האגן עד ששתי הברכיים ב-90 מעלות.',
      'דוחפים חזרה מהרגל הקדמית לעמדת המוצא.',
      'חוזרים על התנועה עם הרגל השנייה לסירוגין.',
      '!שמרו על הברך הקדמית בדיוק מעל הקרסול מבלי לחרוג מקצות הבהונות.'
    ],
    steps_en: [
      'Stand tall with your feet hip-width apart and hands at your hips.',
      'Step forward with one leg and lower your hips until both knees are bent at roughly 90 degrees.',
      'Push back off the front foot to return to the starting position.',
      'Repeat on the other side, alternating with every repetition.',
      '!Keep your front knee directly above your ankle, not shooting past your toes.'
    ],
    category: 'aerobic',
    duration: 2.4,
    keyTimes: [0, 0.6, 1.2, 1.8]
  },
  {
    id: 'crunch',
    he: 'כפיפות בטן',
    en: 'Crunch',
    amount: '20 פעמים',
    amount_en: '20 reps',
    steps: [
      'שוכבים על הגב עם ברכיים כפופות וכפות רגליים מונחות על הרצפה.',
      'מניחים אצבעות קלות מאחורי האוזניים או משלבים ידיים על החזה.',
      'מכווצים את שרירי הבטן ומרימים את השכמות והגב העליון מעט מהרצפה.',
      'עוצרים לרגע בשיא הכיווץ, ואז יורדים לאט ובשליטה.',
      '!אל תמשכו את הצוואר או הראש עם הידיים; הניעו את הגוף ממרכז הבטן בלבד.'
    ],
    steps_en: [
      'Lie on your back with knees bent and feet flat on the floor.',
      'Place your fingertips lightly behind your ears or cross your arms over your chest.',
      'Contract your abdominal muscles to curl your shoulders and upper back off the floor.',
      'Pause briefly at the top, then lower back down with control.',
      '!Do not pull on your neck or head with your hands; initiate the movement purely from your core.'
    ],
    category: 'aerobic',
    view: 'floor',
    duration: 2,
    keyTimes: [0, 1.0]
  },
  {
    id: 'high-knees',
    he: 'ריצה עם ברכיים גבוהות',
    en: 'High knees',
    amount: '30 שניות',
    amount_en: '30 seconds',
    steps: [
      'עמידה זקופה, רגליים ברוחב האגן.',
      'מרימים ברך אחת לגובה החזה תוך תנופת יד נגדית קדימה.',
      'מחליפים רגליים במהירות בקפיצות קלות וקצביות.',
      'שומרים על גב ישר ובטן אסופה לאורך כל התרגיל.',
      '!נחתו ברכות על כריות כפות הרגליים כדי לשמור על המפרקים.'
    ],
    steps_en: [
      'Stand tall with feet hip-width apart.',
      'Drive one knee up toward your chest while pumping the opposite arm forward.',
      'Immediately switch legs on a light, bouncy hop, maintaining a brisk running pace.',
      'Keep your core engaged and your torso upright throughout the movement.',
      '!Land softly on the balls of your feet to minimize joint impact.'
    ],
    category: 'aerobic',
    duration: 0.8,
    keyTimes: [0, 0.4]
  },
  {
    id: 'plank',
    he: 'פלאנק מלא',
    en: 'Plank',
    amount: '45 שניות',
    amount_en: '45 seconds',
    steps: [
      'מניחים כפות ידיים מתחת לכתפיים ומיישרים את הרגליים לאחור.',
      'מכווצים בטן וישבן כדי ליצור קו ישר ואחיד מהראש ועד העקבים.',
      'שומרים על צוואר ניטרלי ומבט מעט לפני כפות הידיים.',
      'מחזיקים את התנוחה ביציבות וממשיכים לנשום ברציפות.',
      '!אל תאפשרו לגב התחתון לקרוס או לאגן לבלוט למעלה.'
    ],
    steps_en: [
      'Position your hands directly beneath your shoulders and extend your legs straight behind you.',
      'Engage your core, glutes, and thighs to form a rigid, straight line from head to heels.',
      'Keep your neck neutral and gaze at the floor just past your hands.',
      'Hold the position steadily while breathing continuously.',
      '!Do not allow your lower back to sag or your hips to pike up toward the ceiling.'
    ],
    category: 'holds',
    view: 'floor',
    duration: 4,
    keyTimes: [0, 2.0]
  },
  {
    id: 'wall-sit',
    he: 'ישיבת קיר',
    en: 'Wall sit',
    amount: '45 שניות',
    amount_en: '45 seconds',
    steps: [
      'נשענים עם הגב שטוח על הקיר ומחליקים מטה עד שהירכיים מקבילות לרצפה.',
      'וודאו שהברכיים בדיוק מעל הקרסוליים בזווית של 90 מעלות.',
      'הצמידו את כל הגב בחוזקה לקיר והניחו ידיים על הירכיים או שלובות על החזה.',
      'נשמו באופן יציב והחזיקו את התנוחה לאורך הזמן המומלץ.',
      '!אם אתם חשים עומס בברכיים, החליקו מעט למעלה לתנוחה פחות עמוקה.'
    ],
    steps_en: [
      'Stand with your back flat against a wall and slide down until your thighs are parallel to the floor.',
      'Ensure your knees are directly above your ankles, forming a 90-degree angle.',
      'Press your entire back firmly against the wall and rest your hands on your thighs or across your chest.',
      'Breathe steadily and hold the position for the suggested duration.',
      '!If you feel knee discomfort, slide up slightly to a higher sitting position.'
    ],
    category: 'holds',
    duration: 4,
    keyTimes: [0, 2.0]
  }
];

for (const ex of newExercises) {
  const existingIdx = data.exercises.findIndex(e => e.id === ex.id);
  if (existingIdx !== -1) {
    data.exercises[existingIdx] = ex;
  } else {
    data.exercises.unshift(ex);
  }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully updated exercises.json! Total exercises:', data.exercises.length, 'Categories:', data.categories.length);
