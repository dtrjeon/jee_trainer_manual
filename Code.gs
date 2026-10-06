/**
 * JEE 62기 훈련자 매뉴얼 - Q&A 등록용 Apps Script
 * 사용법
 *  1) 새 구글시트를 만들고  확장 프로그램 > Apps Script 에 이 코드를 붙여넣기
 *  2) 배포 > 새 배포 > 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 > 배포
 *  3) 나온 웹앱 URL을 JEE_62_check.html 의 QNA_GAS_URL 에 붙여넣기
 *  (시트 'QnA', 'QnA_답변'과 Drive 폴더는 자동 생성됩니다)
 *  코드 수정 후에는 '배포 관리 > 새 버전'으로 다시 배포해야 반영됩니다.
 */
const Q_SHEET = 'QnA';
const A_SHEET = 'QnA_답변';
const FOLDER_NAME = 'JEE62_QnA_첨부';
const Q_HEAD = ['id','등록일시','성명','내용','파일명','파일형식','파일ID','전화번호'];
const A_HEAD = ['id','질문id','등록일시','성명','내용','파일명','파일형식','파일ID'];

function sheet_(name, head){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function file_(name,mime,id){ return id ? {name:name, mime:mime, id:id} : null; }

function doGet(e){
  try{
    const qs = sheet_(Q_SHEET,Q_HEAD).getDataRange().getValues().slice(1);
    const as = sheet_(A_SHEET,A_HEAD).getDataRange().getValues().slice(1);
    const items = qs.filter(r=>r[0]).map(r=>({
      id:String(r[0]), createdAt:new Date(r[1]).toISOString(), name:r[2], phone:String(r[7]||''), text:r[3], file:file_(r[4],r[5],r[6]),
      answers: as.filter(a=>String(a[1])===String(r[0])).map(a=>({
        id:String(a[0]), createdAt:new Date(a[2]).toISOString(), name:a[3], text:a[4], file:file_(a[5],a[6],a[7])
      }))
    })).reverse();
    return json_({ok:true, items:items});
  }catch(err){ return json_({ok:false, error:String(err)}); }
}

function saveFile_(f){
  if(!f || !f.data) return {name:'',mime:'',id:''};
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  const blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.mime||'application/octet-stream', String(f.name||'file').slice(0,100));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {name:file.getName(), mime:f.mime||'', id:file.getId()};
}

function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    const d = JSON.parse(e.postData.contents);
    const name = String(d.name||'').trim().slice(0,30);
    const text = String(d.text||'').slice(0,3000);
    if(!name) throw new Error('성명이 필요합니다.');
    if(!text && !(d.file&&d.file.data)) throw new Error('내용이 필요합니다.');
    const f = saveFile_(d.file);
    const now = new Date();
    if(d.action==='addQuestion'){
      sheet_(Q_SHEET,Q_HEAD).appendRow(['q'+now.getTime(), now, name, text, f.name, f.mime, f.id, "'"+String(d.phone||'').slice(0,20)]);
    } else if(d.action==='addAnswer'){
      sheet_(A_SHEET,A_HEAD).appendRow(['a'+now.getTime(), String(d.qid), now, name, text, f.name, f.mime, f.id]);
    } else throw new Error('알 수 없는 요청');
    return json_({ok:true});
  }catch(err){ return json_({ok:false, error:String(err)}); }
  finally{ lock.releaseLock(); }
}
