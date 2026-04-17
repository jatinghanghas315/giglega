(function(){
  function generateGigId(){
    var now=new Date();
    var yyyy=now.getFullYear();
    var mm=String(now.getMonth()+1).padStart(2,'0');
    var dd=String(now.getDate()).padStart(2,'0');
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var rand='';
    for(var i=0;i<5;i++) rand+=chars.charAt(Math.floor(Math.random()*chars.length));
    return 'GIG-'+yyyy+mm+dd+'-'+rand;
  }
  function isValidGigId(id){
    return /^GIG-\d{8}-[A-Z2-9]{5}$/.test((id||'').trim().toUpperCase());
  }
  window.generateGigId=generateGigId;
  window.isValidGigId=isValidGigId;
  if(typeof module!=='undefined'&&module.exports) module.exports={generateGigId,isValidGigId};
})();
