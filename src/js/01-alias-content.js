/* 01-alias-content.js: Content for the hand-built animated lesson "Why did both lists change?" (Python and Java text, steps, guide). */
/* ---------------- content ---------------- */
const LESSON_ID = 'two-names-one-list';
const L = {
  py: {
    name:'Python', names:'names', nameWord:'name', nameWords:'names', listWord:'list', listWords:'lists',
    listLabel:n=>'list #'+n, objects:'objects',
    code:{ alias:['a = [1, 2]','b = a','b.append(3)','print(a)'], copy:['a = [1, 2]','b = a.copy()','b.append(3)','print(a)'] },
    wrapBefore:[], wrapAfter:[],
    printCall:'print(a)', copyCall:'a.copy()', run2:'b = a.copy()',
    runUrl:'https://onecompiler.com/python', errorOpt:'An error',
    pseudo:{
      alias:['Make a list holding 1 and 2. Call it a.','Give that same list a second name, b.','Go to the list b names. Add 3 at the end.','Go to the list a names. Show what it holds.'],
      copy:['Make a list holding 1 and 2. Call it a.','Make a new list. Copy each value from a’s list into the same index. Call it b.','Go to the list b names. Add 3 at the end.','Go to the list a names. Show what it holds.']
    },
    check:{ code:'x = [5]\ny = x\nx.append(6)\nprint(y)', q:'What does print(y) display?' }
  },
  java: {
    name:'Java', names:'variables', nameWord:'variable', nameWords:'variables', listWord:'ArrayList', listWords:'lists',
    listLabel:n=>'ArrayList #'+n, objects:'objects in memory',
    code:{ alias:['List<Integer> a = new ArrayList<>(List.of(1, 2));','List<Integer> b = a;','b.add(3);','System.out.println(a);'],
           copy:['List<Integer> a = new ArrayList<>(List.of(1, 2));','List<Integer> b = new ArrayList<>(a);','b.add(3);','System.out.println(a);'] },
    wrapBefore:['import java.util.*;','','public class Main {','  public static void main(String[] args) {'], wrapAfter:['  }','}'],
    printCall:'System.out.println(a)', copyCall:'new ArrayList<>(a)', run2:'new ArrayList<>(a)',
    runUrl:'https://onecompiler.com/java', errorOpt:'A compile error',
    pseudo:{
      alias:['Make an ArrayList holding 1 and 2. Store a reference to it in a.','Copy the reference from a into b. Both point to one list.','Follow b to its list. Add 3 at the end.','Follow a to its list. Print what it holds.'],
      copy:['Make an ArrayList holding 1 and 2. Store a reference to it in a.','Make a new ArrayList. Copy each element from a’s list into the same index. Store its reference in b.','Follow b to its list. Add 3 at the end.','Follow a to its list. Print what it holds.']
    },
    check:{ code:'List<Integer> x = new ArrayList<>(List.of(5));\nList<Integer> y = x;\nx.add(6);\nSystem.out.println(y);', q:'What does System.out.println(y) display?' }
  }
};
const T = (py, java) => ({py, java: java === undefined ? py : java});

/* Scene geometry (stable positions across steps) */
const NX = 120, AY = 175, BY = 345, LX = 330, L1Y = 145, L2Y = 315, CW = 70, CH = 58;
const CON = {x:330, y:452, w:420, h:62};

function sceneFor(key, lang){
  const ll = L[lang].listLabel;
  const s = {zones:true, names:[], lists:[], lit:[], console:null, anims:[], caps:[]};
  const A = (t='L1') => ({id:'a', x:NX, y:AY, target:t});
  const B = (t) => ({id:'b', x:NX, y:BY, target:t});
  const list1 = v => ({id:'L1', x:LX, y:L1Y, label:ll(1), values:v, cw:CW});
  const list2 = v => ({id:'L2', x:LX, y:L2Y, label:ll(2), values:v, cw:CW});
  const con = (text, q) => Object.assign({}, CON, {text, q:!!q, label:'Output'});
  switch(key){
    case 'start':
      s.hint = 'Nothing has run yet. Names will appear on the left, objects on the right.';
      s.console = con('', true); break;
    case 'create':
      s.lists=[list1([1,2])]; s.names=[A()]; s.console=con('',true);
      s.anims=[{k:'fade',sel:'#list-L1',d:0},{k:'tiles',list:'L1',d:150},{k:'fade',sel:'#tag-a',d:650},{k:'draw',id:'a',d:800}]; break;
    case 'assign':
      s.lists=[list1([1,2])]; s.names=[A(),B('L1')]; s.lit=['b']; s.console=con('',true);
      s.anims=[{k:'fade',sel:'#tag-b',d:0},{k:'draw',id:'b',d:200}]; break;
    case 'append':
      s.lists=[list1([1,2,3])]; s.names=[A(),B('L1')]; s.lit=['b']; s.console=con('',true);
      s.newSlot={list:'L1',i:2};
      s.anims=[{k:'ghost',list:'L1',i:2,d:0},{k:'travel',list:'L1',i:2,from:'tag-b',d:350,dur:900}]; break;
    case 'predict':
      s.lists=[list1([1,2,3])]; s.names=[A(),B('L1')]; s.console=con('?',true); break;
    case 'reveal':
      s.lists=[list1([1,2,3])]; s.names=[A(),B('L1')]; s.lit=['a']; s.console=con('[1, 2, 3]');
      s.anims=[{k:'chip',list:'L1',text:'[1, 2, 3]',d:450,dur:800},{k:'ctext',d:1250}]; break;
    case 'change':
      s.lists=[list1([1,2])]; s.names=[A()]; s.console=con('',true);
      s.anims=[{k:'fade',sel:'#list-L1',d:0},{k:'tiles',list:'L1',d:150},{k:'fade',sel:'#tag-a',d:650},{k:'draw',id:'a',d:800}]; break;
    case 'copy':
      s.lists=[list1([1,2]), list2([1,2])]; s.names=[A(),B('L2')]; s.lit=['b']; s.console=con('',true);
      s.anims=[{k:'fade',sel:'#list-L2 .frame',d:0},{k:'hideTiles',list:'L2'},
               {k:'travel',list:'L2',i:0,fromList:'L1',d:500,dur:750},
               {k:'travel',list:'L2',i:1,fromList:'L1',d:1400,dur:750},
               {k:'fade',sel:'#tag-b',d:2250},{k:'draw',id:'b',d:2400}]; break;
    case 'append2':
      s.lists=[list1([1,2]), list2([1,2,3])]; s.names=[A(),B('L2')]; s.lit=['b']; s.console=con('',true);
      s.anims=[{k:'ghost',list:'L2',i:2,d:0},{k:'travel',list:'L2',i:2,from:'tag-b',d:350,dur:900}]; break;
    case 'predict2':
      s.lists=[list1([1,2]), list2([1,2,3])]; s.names=[A(),B('L2')]; s.console=con('?',true); break;
    case 'reveal2':
      s.lists=[list1([1,2]), list2([1,2,3])]; s.names=[A(),B('L2')]; s.lit=['a']; s.console=con('[1, 2]');
      s.anims=[{k:'chip',list:'L1',text:'[1, 2]',d:450,dur:800},{k:'ctext',d:1250}]; break;
    case 'recap': {
      s.zones=false; const c=52;
      s.caps=[{x:200,y:100,t:L[lang].code.alias[1].replace(/^List<Integer> /,''),sub:'Run 1: 2 '+L[lang].nameWords+', 1 list'},
              {x:600,y:100,t:L[lang].code.copy[1].replace(/^List<Integer> /,''),sub:'Run 2: 2 '+L[lang].nameWords+', 2 lists'}];
      s.divider=true;
      s.lists=[{id:'R1',x:180,y:200,label:ll(1),values:[1,2,3],cw:c},
               {id:'R2',x:575,y:150,label:ll(1),values:[1,2],cw:c},
               {id:'R3',x:575,y:320,label:ll(2),values:[1,2,3],cw:c}];
      s.names=[{id:'a',x:70,y:170,target:'R1',key:'ra1'},{id:'b',x:70,y:300,target:'R1',key:'rb1'},
               {id:'a',x:470,y:180,target:'R2',key:'ra2'},{id:'b',x:470,y:350,target:'R3',key:'rb2'}];
      s.consoles=[{x:40,y:452,w:320,h:62,text:'[1, 2, 3]',label:'Output'},
                  {x:440,y:452,w:320,h:62,text:'[1, 2]',label:'Output'}];
      s.anims=[{k:'fade',sel:'.half-l',d:0},{k:'fade',sel:'.half-r',d:350}];
      break; }
  }
  return s;
}

/* Steps: one teaching job each */
const STEPS = [
  {key:'start', phase:1, mode:'alias', line:-1, pseudo:-1, flow:['start'], dec:0,
   title:T('The program'),
   body:T(['This program makes a list, gives it a second name, then changes it through that second name. The last line prints the first name.','Run it one line at a time and watch what each line creates.'],
          ['This program makes an ArrayList, copies the variable that refers to it, then changes the list through the copy. The last line prints the first variable.','Run it one line at a time and watch what each line creates.']),
   next:T('Create the list')},
  {key:'create', phase:1, mode:'alias', line:0, pseudo:0, flow:['n1'], dec:0,
   title:T('Create the list'),
   body:T(['Python created one list holding 1 and 2. The name <code>a</code> refers to it.'],
          ['Java created one ArrayList holding 1 and 2. The variable <code>a</code> stores a reference to it.']),
   term:T('<b>Name:</b> a label that refers to an object. The arrow shows which object <code>a</code> refers to.',
          '<b>Reference:</b> the arrow from a variable to an object. <code>a</code> holds the arrow, not the list itself.'),
   next:T('Assign b = a')},
  {key:'assign', phase:1, mode:'alias', line:1, pseudo:1, flow:['n2'], dec:1,
   title:T('Assign b'),
   body:T(['<code>b = a</code> gives this list a second name. Nothing was copied.','Count the names, then count the lists: 2 names, 1 list.'],
          ['<code>b = a</code> copies the reference, not the list. Both variables now point to the same ArrayList.','Count the variables, then count the lists: 2 variables, 1 list.']),
   next:T('Append 3 through b','Add 3 through b')},
  {key:'append', phase:1, mode:'alias', line:2, pseudo:2, flow:['n3'], dec:2,
   title:T('Append through b','Add through b'),
   body:T(['Python follows <code>b</code> to the list and adds 3 at the end, at index 2. That list now holds 1, 2 and 3.'],
          ['<code>b.add(3)</code> follows b’s reference to the ArrayList and adds 3 at index 2. That list now holds 1, 2 and 3.']),
   next:T('Predict print(a)','Predict the output')},
  {key:'predict', phase:1, mode:'alias', line:3, pseudo:3, flow:['n4'], dec:2,
   title:T('Predict'),
   body:T(['The last line prints <code>a</code>. Follow the arrow from <code>a</code> before you answer.'],
          ['The last line prints <code>a</code>. Follow a’s reference before you answer.']),
   predict:{q:T('What will print(a) display?','What will System.out.println(a) display?'), right:1,
     opts:lang=>['[1, 2]','[1, 2, 3]','[3]',L[lang].errorOpt],
     fb:T(['Not quite. That would be true if a had its own list. Follow a’s arrow: it lands on the same list b just changed, which now holds [1, 2, 3].',
           'Right. a and b refer to the same list, so the 3 added through b is visible through a.',
           'Not quite. append adds 3 to the end and keeps 1 and 2. The list holds [1, 2, 3].',
           'No error here. a still names a list, and printing a list shows its current contents.'],
          ['Not quite. That would be true if a had its own list. Follow a’s reference: it lands on the same ArrayList b just changed, which now holds [1, 2, 3].',
           'Right. a and b hold references to the same ArrayList, so the 3 added through b is visible through a.',
           'Not quite. add puts 3 at the end and keeps 1 and 2. The list holds [1, 2, 3].',
           'This compiles and runs. a is a valid List variable, and printing it shows the list’s contents.'])},
   next:T('Reveal print(a)','Reveal the output')},
  {key:'reveal', phase:1, mode:'alias', line:3, pseudo:3, flow:['n4','end'], dec:3,
   title:T('Reveal'),
   body:T(['Python follows <code>a</code> to the list and prints what it holds now: <code>[1, 2, 3]</code>.','a sees the 3 because it refers to the same list you changed through b.'],
          ['Java follows a’s reference to the ArrayList and prints <code>[1, 2, 3]</code>.','The 3 added through b shows up through a because there is only one list.']),
   next:T('Change b = a to a copy')},
  {key:'change', phase:2, mode:'copy', line:0, pseudo:0, flow:['n1'], dec:0, edited:1,
   title:T('Change one line'),
   body:T(['Line 2 now reads <code>b = a.copy()</code>, and the program starts over.','Line 1 runs again: a fresh list holding 1 and 2, named <code>a</code>.'],
          ['The second line now reads <code>List&lt;Integer&gt; b = new ArrayList&lt;&gt;(a);</code>, and the program starts over.','The first line runs again: a fresh ArrayList holding 1 and 2, referenced by <code>a</code>.']),
   next:T('Run b = a.copy()','Run new ArrayList<>(a)')},
  {key:'copy', phase:2, mode:'copy', line:1, pseudo:1, flow:['n2a','n2q','n2c','n2b'], dec:1,
   title:T('Copy the list'),
   body:T(['<code>a.copy()</code> builds a second list and copies each value to the same index: 1 into index 0, then 2 into index 1. b refers to the new list.','Count again: 2 names, 2 lists.'],
          ['<code>new ArrayList&lt;&gt;(a)</code> builds a second ArrayList and copies each element to the same index: 1 into index 0, then 2 into index 1. b refers to the new list.','Count again: 2 variables, 2 lists.']),
   term:T('<b>Shallow copy:</b> a new outer list that holds the same values as the original.',
          '<b>Copy constructor:</b> <code>new ArrayList&lt;&gt;(a)</code> makes a separate list with a’s elements. Like Python’s <code>copy()</code>, it is a shallow copy.'),
   next:T('Append 3 through b','Add 3 through b')},
  {key:'append2', phase:2, mode:'copy', line:2, pseudo:2, flow:['n3'], dec:2,
   title:T('Append through b again','Add through b again'),
   body:T(['Python follows <code>b</code> to list #2 and adds 3 at index 2. Look at which list grew.'],
          ['<code>b.add(3)</code> follows b’s reference to ArrayList #2 and adds 3 at index 2. Look at which list grew.']),
   next:T('Predict print(a)','Predict the output')},
  {key:'predict2', phase:2, mode:'copy', line:3, pseudo:3, flow:['n4'], dec:2,
   title:T('Predict again'),
   body:T(['Same last line, new situation. Follow the arrow from <code>a</code>.'],['Same last line, new situation. Follow a’s reference.']),
   predict:{q:T('What will print(a) display now?','What will System.out.println(a) display now?'), right:0,
     opts:()=>['[1, 2]','[1, 2, 3]'],
     fb:T(['Right. a still refers to list #1, which never received the 3.',
           'Not this time. The 3 went into list #2, the one b refers to. a’s arrow lands on list #1, which still holds [1, 2].'],
          ['Right. a still refers to ArrayList #1, which never received the 3.',
           'Not this time. The 3 went into ArrayList #2, the one b refers to. a’s reference lands on ArrayList #1, which still holds [1, 2].'])},
   next:T('Reveal print(a)','Reveal the output')},
  {key:'reveal2', phase:2, mode:'copy', line:3, pseudo:3, flow:['n4','end'], dec:3,
   title:T('Reveal'),
   body:T(['Python follows <code>a</code> to list #1 and prints <code>[1, 2]</code>.','The 3 went into b’s own list, so a’s list never changed.'],
          ['Java follows a’s reference to ArrayList #1 and prints <code>[1, 2]</code>.','The 3 went into b’s own list, so a’s list never changed.']),
   next:T('Compare both runs')},
  {key:'recap', phase:3, mode:'both', line:-1, pseudo:-1, flow:['end'], dec:4,
   title:T('What you learned'),
   body:T(['In run 1, <code>b = a</code> gave one list two names, so the 3 appended through b showed up in <code>print(a)</code>: [1, 2, 3].','In run 2, <code>a.copy()</code> made a separate outer list, so a stayed [1, 2]. Assignment adds a name. Copying adds a list.'],
          ['In run 1, <code>b = a</code> copied a reference, so both variables pointed to one ArrayList and printing a showed [1, 2, 3].','In run 2, <code>new ArrayList&lt;&gt;(a)</code> made a second list, so a stayed [1, 2]. Assigning a reference adds an arrow. Copying adds an object.']),
   predict:{check:true, right:1, opts:()=>['[5]','[5, 6]'],
     fb:T(['Not quite. Find the step that decides it: y = x makes no new list. x and y share one list, so the 6 appended through x shows through y: [5, 6].',
           'Right. The deciding step is y = x: no new list was made, so the 6 appended through x shows through y.'],
          ['Not quite. Find the step that decides it: y = x copies a reference, not the list. x and y share one ArrayList, so the 6 shows through y: [5, 6].',
           'Right. The deciding step is y = x: it copies a reference, so the 6 added through x shows through y.'])},
   next:T('Next lesson', 'Finish lesson')}
];

/* What to look at, and a one-line summary for the steps-so-far log */
const GUIDE = {
  start:   {look:T('The code panel, with line numbers. Nothing exists on the canvas yet.'), sum:T('Read the program.')},
  create:  {look:T('The new list on the right, and the arrow from a to it.','The new ArrayList on the right, and the arrow from a to it.'), sum:T('a = [1, 2] made one list named a.','a got a reference to a new ArrayList [1, 2].')},
  assign:  {look:T('Two arrows now end at the same list. Count the arrows, then the lists.'), sum:T('b = a gave the same list a second name.','b = a copied the reference, not the list.')},
  append:  {look:T('The tile 3 travels along b’s arrow into a new slot, index 2.'), sum:T('Through b, 3 was appended to the shared list.','Through b, 3 was added to the shared list.')},
  predict: {look:T('Start at a and follow its arrow. Which list does it reach, and what is in it?'), sum:T('You predicted print(a).','You predicted the output.')},
  reveal:  {look:T('a’s arrow lights up and the list’s contents travel to the output.'), sum:T('print(a) showed [1, 2, 3].','println(a) showed [1, 2, 3].')},
  change:  {look:T('Line 2 in the code panel is marked as edited. The scene restarts.','The second line in the code panel is marked as edited. The scene restarts.'), sum:T('You changed b = a to b = a.copy().','You changed b = a to new ArrayList<>(a).')},
  copy:    {look:T('Each value travels from list #1 to the same index in list #2, one at a time.','Each value travels from ArrayList #1 to the same index in ArrayList #2, one at a time.'), sum:T('The copy made list #2, and b points to it.','The copy made ArrayList #2, and b points to it.')},
  append2: {look:T('Only the list at the end of b’s arrow grows.'), sum:T('3 went into list #2 only.','3 went into ArrayList #2 only.')},
  predict2:{look:T('Follow a’s arrow again. Did that list change?'), sum:T('You predicted print(a) again.','You predicted the output again.')},
  reveal2: {look:T('The output shows a’s list, which still holds 1 and 2.'), sum:T('print(a) showed [1, 2].','println(a) showed [1, 2].')},
  recap:   {look:T('Left: one list, two arrows. Right: two lists, one arrow each.'), sum:T('Compared both runs.')}
};
