/* Case File: curated sample cases.
 * Each is analysed to the same standard the AI is asked for, so the demo cases play
 * instantly and offline, and serve as reference answers for evaluating the AI.
 * Text is written in second person; no names survive into titles or shareable output.
 */
(function (global) {
  'use strict';
  const CF = (global.CaseFile = global.CaseFile || {});

  CF.SAMPLES = [
    {
      key: 'boss',
      chip: 'Boss wants a “quick chat”',
      text: 'My boss messaged me at 4:55pm: "Can we have a quick chat tomorrow?" No context. She’s been a bit short with me this week. I’m definitely getting fired.',
      analysis: {
        safety: 'ok',
        case_title: 'The Case of the 4:55 Message',
        conclusion: 'You’re getting fired.',
        exhibits: [
          { id: 'e1', kind: 'camera', text: 'Your boss messaged you at 4:55 pm.', why: 'The time is stamped on the message. Anyone could check it.' },
          { id: 'e2', kind: 'camera', text: 'The message said: “Can we have a quick chat tomorrow?”', why: 'Her exact words, on record.' },
          { id: 'e3', kind: 'camera', text: 'The message came with no context.', why: 'Nothing else was written. That part is observable.' },
          { id: 'e4', kind: 'brain', text: 'She’s been short with you this week.', why: 'A camera could record brief replies. “Short with me” is a reading of why.' },
          { id: 'e5', kind: 'brain', text: 'You’re definitely getting fired.', why: 'A prediction. No camera can film tomorrow.' }
        ],
        witness_id: 'e5',
        unknowns: [
          { id: 'u1', text: 'What does she want to talk about?', about: 'e2' },
          { id: 'u2', text: 'Does she often book chats without saying why?', about: 'e3' },
          { id: 'u3', text: 'Has her week been busy or stressful?', about: 'e4' }
        ],
        suspects: [
          { id: 's1', name: 'THE CHECK-IN', theory: 'A routine catch-up she didn’t think needed context.', fits: ['e1', 'e2', 'e3'], needs: 'She was busy and typed fast at 5 pm.', plausibility: 'common', fear: false, line: 'I’m a calendar invite with no agenda. Boring, but very common.' },
          { id: 's2', name: 'THE NEW TASK', theory: 'She wants to hand you a project or shift your priorities.', fits: ['e1', 'e2', 'e3'], needs: 'Something is changing on the team.', plausibility: 'common', fear: false, line: 'I come with extra work. Not exciting. Not scary either.' },
          { id: 's3', name: 'THE BAD WEEK', theory: 'Her brief replies are about her own pressure; the chat is unrelated.', fits: ['e1', 'e2', 'e3'], needs: 'Her week has been heavy.', plausibility: 'possible', fear: false, line: 'Bosses have bad weeks too. I explain the short replies.' },
          { id: 's4', name: 'THE SACKING', theory: 'She plans to let you go tomorrow.', fits: ['e1', 'e2', 'e3'], needs: 'A serious problem raised with no earlier warning.', plausibility: 'possible', fear: true, line: 'I’m the scariest suspect. That’s not the same as the likeliest.' }
        ],
        fear_support: 'weak',
        support_reason: 'The message is neutral. Nothing in it points to a firing, and you haven’t mentioned any warnings.',
        leads: [
          { kind: 'ask', text: 'Reply: “Sure! Anything you’d like me to bring or prepare?”', for: 'u1' },
          { kind: 'prepare', text: 'Jot down two recent wins and one thing you’d like help with.', for: 'u3' },
          { kind: 'steady', text: 'Close the laptop. The chat happens tomorrow; tonight is still yours.', for: '' }
        ]
      }
    },
    {
      key: 'reply',
      chip: 'Read at 1:12, no reply',
      text: 'I texted my best friend at lunch asking if she wanted dinner on Friday. It says read at 1:12pm. It’s now 8pm and nothing. She’s clearly annoyed with me about something.',
      analysis: {
        safety: 'ok',
        case_title: 'The Case of the Silent Read Receipt',
        conclusion: 'Your friend is annoyed with you.',
        exhibits: [
          { id: 'e1', kind: 'camera', text: 'You texted your friend at lunch about dinner on Friday.', why: 'The message exists. Anyone could read it.' },
          { id: 'e2', kind: 'camera', text: 'It shows “Read” at 1:12 pm.', why: 'The receipt is on screen. It shows she opened it, not what she felt.' },
          { id: 'e3', kind: 'camera', text: 'It’s 8 pm and there’s no reply yet.', why: 'Silence is observable. Its reason isn’t.' },
          { id: 'e4', kind: 'brain', text: 'She’s clearly annoyed with you about something.', why: 'That’s a story added to the silence. A camera can’t see annoyance.' }
        ],
        witness_id: 'e4',
        unknowns: [
          { id: 'u1', text: 'What has her day looked like?', about: 'e3' },
          { id: 'u2', text: 'Does she usually reply quickly?', about: 'e2' },
          { id: 'u3', text: 'Has anything happened between you lately?', about: 'e4' }
        ],
        suspects: [
          { id: 's1', name: 'THE BUSY DAY', theory: 'She read it between things and meant to answer later.', fits: ['e1', 'e2', 'e3'], needs: 'Her afternoon filled up.', plausibility: 'common', fear: false, line: 'I read it in a lift. Then the doors opened.' },
          { id: 's2', name: 'THE MAYBE', theory: 'She’s checking her Friday plans before saying yes.', fits: ['e1', 'e2', 'e3'], needs: 'Friday isn’t settled for her yet.', plausibility: 'common', fear: false, line: 'I’m waiting on someone else’s answer before I give mine.' },
          { id: 's3', name: 'THE MENTAL REPLY', theory: 'She answered in her head and forgot to hit send.', fits: ['e1', 'e2', 'e3'], needs: 'She’s human.', plausibility: 'common', fear: false, line: 'I typed the reply. In my imagination.' },
          { id: 's4', name: 'THE COLD SHOULDER', theory: 'She’s annoyed with you and staying quiet.', fits: ['e1', 'e2', 'e3'], needs: 'Something upset her that she hasn’t mentioned.', plausibility: 'possible', fear: true, line: 'I’m possible. I’m also the only suspect who needs a secret grudge.' }
        ],
        fear_support: 'weak',
        support_reason: 'Seven hours of silence after a read receipt fits many ordinary explanations.',
        leads: [
          { kind: 'ask', text: 'Send a light follow-up: “No rush on Friday, just let me know!”', for: 'u1' },
          { kind: 'prepare', text: 'Make a Friday backup plan you’d enjoy either way.', for: 'u2' },
          { kind: 'steady', text: 'Put your phone in another room for one hour.', for: '' }
        ]
      }
    },
    {
      key: 'talk',
      chip: 'Froze mid-presentation',
      text: 'In my presentation today I lost my place and said "um" for about ten seconds. Two people looked at their phones. Everyone thinks I’m incompetent now and I’ll never live it down.',
      analysis: {
        safety: 'ok',
        case_title: 'The Case of the Ten-Second Pause',
        conclusion: 'Everyone thinks you’re incompetent.',
        exhibits: [
          { id: 'e1', kind: 'camera', text: 'You lost your place during your presentation today.', why: 'A video would show the pause. That part happened.' },
          { id: 'e2', kind: 'camera', text: 'You said “um” for about ten seconds.', why: 'A camera records the pause. It wouldn’t time it the way it felt.' },
          { id: 'e3', kind: 'camera', text: 'Two people looked at their phones.', why: 'Observable. Why they looked is a separate question.' },
          { id: 'e4', kind: 'brain', text: 'You’ll never live it down.', why: 'A prediction about months of other people’s memories.' },
          { id: 'e5', kind: 'brain', text: 'Everyone thinks you’re incompetent now.', why: 'That’s mind-reading a whole room. A camera only sees faces.' }
        ],
        witness_id: 'e5',
        unknowns: [
          { id: 'u1', text: 'What did people actually say afterwards?', about: 'e5' },
          { id: 'u2', text: 'Why were those two on their phones?', about: 'e3' },
          { id: 'u3', text: 'How did the rest of the presentation go?', about: 'e1' }
        ],
        suspects: [
          { id: 's1', name: 'THE BLIP', theory: 'People noticed a pause, then got on with their day.', fits: ['e1', 'e2', 'e3'], needs: 'People mostly think about themselves.', plausibility: 'common', fear: false, line: 'I lasted ten seconds. People forget me by lunch.' },
          { id: 's2', name: 'THE PHONE HABIT', theory: 'The two phone-checkers do that in every meeting.', fits: ['e1', 'e2', 'e3'], needs: 'Meetings are long and phones are close.', plausibility: 'common', fear: false, line: 'I check my phone at weddings. Don’t take it personally.' },
          { id: 's3', name: 'THE SYMPATHY', theory: 'Some people felt for you. Most have frozen in front of a room.', fits: ['e1', 'e2', 'e3'], needs: 'Your colleagues are human.', plausibility: 'possible', fear: false, line: 'I’m the “oof, that’s happened to me” feeling.' },
          { id: 's4', name: 'THE REPUTATION HIT', theory: 'One pause changed what everyone thinks of your ability.', fits: ['e1', 'e2', 'e3'], needs: 'People judging you on ten seconds, ignoring everything else.', plausibility: 'long shot', fear: true, line: 'I’d need everyone to forget everything else you’ve ever done.' }
        ],
        fear_support: 'weak',
        support_reason: 'A short pause and two phones are normal meeting events. Nothing shows anyone changed their view of you.',
        leads: [
          { kind: 'ask', text: 'Ask one friendly colleague: “How did that land for you?”', for: 'u1' },
          { kind: 'prepare', text: 'Next time, keep three cue words on a card you can glance at.', for: 'u3' },
          { kind: 'steady', text: 'Write down one part of the presentation that went fine.', for: '' }
        ]
      }
    },
    {
      key: 'partner',
      chip: 'Partner went quiet',
      text: 'My partner was really quiet at dinner tonight and went to bed early without saying much. When I asked if he was okay he said "just tired". He’s losing interest in me.',
      analysis: {
        safety: 'ok',
        case_title: 'The Case of the Quiet Dinner',
        conclusion: 'He’s losing interest in you.',
        exhibits: [
          { id: 'e1', kind: 'camera', text: 'Your partner was quiet at dinner tonight.', why: 'Fewer words is observable. The reason is another question.' },
          { id: 'e2', kind: 'camera', text: 'He went to bed early without saying much.', why: 'A camera would see that.' },
          { id: 'e3', kind: 'camera', text: 'You asked if he was okay.', why: 'You said it out loud. On record.' },
          { id: 'e4', kind: 'camera', text: 'He said: “Just tired.”', why: 'His exact words.' },
          { id: 'e5', kind: 'brain', text: 'He’s losing interest in you.', why: 'A reading of his feelings. A camera can’t see interest.' }
        ],
        witness_id: 'e5',
        unknowns: [
          { id: 'u1', text: 'What was his day like?', about: 'e1' },
          { id: 'u2', text: 'Is “just tired” how he usually describes stress?', about: 'e4' },
          { id: 'u3', text: 'How have the last few weeks felt between you?', about: 'e5' }
        ],
        suspects: [
          { id: 's1', name: 'THE LONG DAY', theory: 'He was exhausted and had nothing left for talking.', fits: ['e1', 'e2', 'e3', 'e4'], needs: 'He’s tired, as he said.', plausibility: 'common', fear: false, line: 'I’m exactly what he told you. Suspicious, I know.' },
          { id: 's2', name: 'THE PRIVATE WORRY', theory: 'Something unrelated is on his mind that he hasn’t put into words.', fits: ['e1', 'e2', 'e3', 'e4'], needs: 'Work, health or family stress.', plausibility: 'possible', fear: false, line: 'I’m about him, not about you.' },
          { id: 's3', name: 'THE INCOMING COLD', theory: 'He’s coming down with something.', fits: ['e1', 'e2', 'e3', 'e4'], needs: 'A bug doing the rounds.', plausibility: 'possible', fear: false, line: 'Achoo. That’s my alibi.' },
          { id: 's4', name: 'THE FADING SPARK', theory: 'His feelings for you are cooling.', fits: ['e1', 'e2', 'e3', 'e4'], needs: 'A pattern over weeks, not one quiet night.', plausibility: 'possible', fear: true, line: 'I’m worth watching for. One evening isn’t a pattern.' }
        ],
        fear_support: 'weak',
        support_reason: 'One quiet evening plus “just tired” fits tiredness best. A real trend would need more evidence.',
        leads: [
          { kind: 'ask', text: 'Tomorrow, ask: “You seemed wiped last night. Anything on your mind?”', for: 'u2' },
          { kind: 'prepare', text: 'Notice the next few days rather than deciding from one evening.', for: 'u3' },
          { kind: 'steady', text: 'Do something kind for yourself tonight that doesn’t depend on him.', for: '' }
        ]
      }
    },
    {
      key: 'lease',
      chip: 'Landlord is selling',
      text: 'My landlord emailed saying he’s selling the building and wants to "discuss my lease" next week. I’m going to lose my flat.',
      analysis: {
        safety: 'care',
        case_title: 'The Case of the Lease Email',
        conclusion: 'You’re going to lose your flat.',
        exhibits: [
          { id: 'e1', kind: 'camera', text: 'Your landlord emailed that he’s selling the building.', why: 'It’s in writing. That part is fact.' },
          { id: 'e2', kind: 'camera', text: 'He wants to “discuss your lease” next week.', why: 'His words, on record. What he’ll say isn’t yet.' },
          { id: 'e3', kind: 'brain', text: 'You’re going to lose your flat.', why: 'A real risk, but still a prediction. The email doesn’t say it.' }
        ],
        witness_id: 'e3',
        unknowns: [
          { id: 'u1', text: 'What does your lease say about a sale?', about: 'e2' },
          { id: 'u2', text: 'Does the buyer want to keep tenants?', about: 'e1' },
          { id: 'u3', text: 'What notice rules apply where you live?', about: 'e3' }
        ],
        suspects: [
          { id: 's1', name: 'THE SAME LEASE', theory: 'The sale goes through and your lease carries on with the new owner.', fits: ['e1', 'e2'], needs: 'Your lease continuing after the sale.', plausibility: 'possible', fear: false, line: 'I’m boring paperwork. Boring is good here.' },
          { id: 's2', name: 'THE INVESTOR', theory: 'He’s selling to a buyer who wants tenants in place.', fits: ['e1', 'e2'], needs: 'A buyer who wants rental income.', plausibility: 'possible', fear: false, line: 'Some buyers love a tenant who pays on time.' },
          { id: 's3', name: 'THE VIEWINGS', theory: 'He needs to arrange inspections and wants to agree access with you.', fits: ['e1', 'e2'], needs: 'Buyers wanting to see the flat.', plausibility: 'common', fear: false, line: 'I’m mostly about keys and calendars.' },
          { id: 's4', name: 'THE MOVE-OUT', theory: 'He plans to end your tenancy so the buyer gets it empty.', fits: ['e1', 'e2'], needs: 'A buyer who wants it vacant, and notice rules that allow it.', plausibility: 'possible', fear: true, line: 'I’m a real possibility. Let’s get ready for me properly.' }
        ],
        fear_support: 'some',
        support_reason: 'A sale does raise the chance of having to move, so this worry has a real basis. It isn’t decided yet.',
        leads: [
          { kind: 'ask', text: 'Reply asking, in writing, what the sale means for your lease.', for: 'u1' },
          { kind: 'prepare', text: 'Re-read your lease and contact a tenants’ advice service in your state.', for: 'u3' },
          { kind: 'steady', text: 'List three areas you’d happily live in, just in case.', for: '' }
        ]
      }
    }
  ];

  /* Glitch's voice by moment and vibe. {verdict} is filled with the case conclusion. */
  CF.VOICE = {
    closed: {
      Jolly: ['Case closed! {verdict} Solved in 0.3 seconds. A personal best!', 'Done and dusted! {verdict} Didn’t even need my magnifying glass.'],
      Cheeky: ['Elementary. {verdict} I didn’t even finish my coffee.', 'Solved. {verdict} You’re welcome.'],
      Unfiltered: ['Done. {verdict} Next case.', 'Obvious. {verdict} I solved it before you finished typing.']
    },
    dust: {
      Jolly: 'Forensics needs a moment. Help me dust the file for prints!',
      Cheeky: 'The lab’s being slow. Make yourself useful: dust for prints.',
      Unfiltered: 'Lab’s still working. Dust the file. Rub it like you mean it.'
    },
    sort: {
      Jolly: 'Let’s tidy the evidence! Left: what a camera saw. Right: what a brain added.',
      Cheeky: 'Sort my evidence. Left for camera facts, right for brain extras. Should be quick.',
      Unfiltered: 'Left: facts. Right: stuff your brain filled in. Go.'
    },
    agree: {
      Jolly: ['Spot on!', 'Lovely sorting.', 'Yep, that’s the one.'],
      Cheeky: ['Fine. Correct.', 'Lucky guess. Or skill.', 'Mm. Agreed.'],
      Unfiltered: ['Right.', 'Correct. Next.', 'Yep.']
    },
    witness: {
      Jolly: 'My star witness was… a guess? Oh dear. Oh dear oh dear.',
      Cheeky: 'Hold on. My key witness was your brain doing an impression of a fact?',
      Unfiltered: 'My star witness was a damn guess. I need to sit down.'
    },
    witnessKept: {
      Jolly: 'You know this case better than me. We’ll keep it as a fact for now.',
      Cheeky: 'Noted. Filed as a fact, under mild protest.',
      Unfiltered: 'Your call. It stays in the facts pile.'
    },
    unknowns: {
      Jolly: 'Blank spots! I may have skipped a few steps.',
      Cheeky: 'Funny. I solved this without asking a single question.',
      Unfiltered: 'I closed this case with holes in it. Embarrassing.'
    },
    pick: {
      Jolly: 'Which blank spot matters most? Circle one.',
      Cheeky: 'Pick the hole that bothers you most.',
      Unfiltered: 'Which gap actually matters? Circle it.'
    },
    lineup: {
      Jolly: 'Meet the suspects! Every one of them fits the camera facts.',
      Cheeky: 'Suspects, step forward. Yes, even the scary one.',
      Unfiltered: 'Lineup. Same facts, different stories. Place your bets.'
    },
    reopened: {
      Jolly: 'Case reopened! My reputation is also reopened.',
      Cheeky: 'Fine. Reopened. Tell no one about the 0.3 seconds.',
      Unfiltered: 'Reopened. I’m keeping the hat though.'
    },
    pending: {
      Jolly: 'Still open. Good detectives can live with that.',
      Cheeky: 'Unsolved, for now. Very noir of us.',
      Unfiltered: 'Open case. That’s honest. Moving on.'
    },
    thin: {
      Jolly: 'Your hunch is strong, but the evidence is thin. Worth checking before you believe it.',
      Cheeky: 'Big hunch, tiny file. Check it before you sign it.',
      Unfiltered: 'You’re betting big on thin evidence. Check first.'
    },
    supported: {
      Jolly: 'Your brain flagged something real. Let’s get you ready for it.',
      Cheeky: 'Credit where it’s due. This one deserves a plan, not a pep talk.',
      Unfiltered: 'This one’s legit. Let’s deal with it properly.'
    }
  };
})(window);
