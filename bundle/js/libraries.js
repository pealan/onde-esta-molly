/**
 * Verifica se o email digitado eh um email valido
 * param: string email a ser verificado
 * 
 * Author: Daniel Machado Reis 
 */
function isEmail(email) {
    var exclude=/[^@\-\.\w]|^[_@\.\-]|[\._\-]{2}|[@\.]{2}|(@)[^@]*\1/;
    var check=/@[\w\-]+\./;
    var checkend=/\.[a-zA-Z]{2,3}$/;
    if(((email.search(exclude) != -1)||(email.search(check)) == -1)||(email.search(checkend) == -1)){return false;}
    else {return true;}
}
/**
 * Retorna o radiobutton selecionado para o tipo
 * Param: nome da classe utilizada nas opcoes do radiobutton
 * Author: Daniel Machado Reis 
 */
function getRadioValue(classeUtilizada) {
    var radVal = ($("."+ classeUtilizada +":checked").val());
    return radVal;
}
/**
 * Funcao que pega o posicionamento de um elemento
 * Author: Andre Araujo 
 */
function getPosicaoElemento(elemID){
	var offsetTrail = document.getElementById(elemID);
	var offsetLeft = 0;
	var offsetTop = 0;
	while (offsetTrail) {
		offsetLeft += offsetTrail.offsetLeft;
		offsetTop += offsetTrail.offsetTop;
		offsetTrail = offsetTrail.offsetParent;
	}
	if (navigator.userAgent.indexOf("Mac") != -1 && 
		typeof document.body.leftMargin != "undefined") {
		offsetLeft += document.body.leftMargin;
		offsetTop += document.body.topMargin;
	}
	return {left:offsetLeft, top:offsetTop};
}
/**
 * Funcao que substitui \n por <br>
 * Author: Andre Araujo 
 */
function htmlEntities(string) {
    while(string.indexOf("\n") > 0){
		string = string.replace("\n","<br />");
	}
	return string;
}
/** 
 * Verifica se os cookies do navegador do usuario estao habilitados
 * Author: Daniel Reis
 */
function cookiesHabilitados(){
	var tmpcookie = new Date();
	chkcookie = (tmpcookie.getTime() + '');
   	document.cookie = "chkcookie=" + chkcookie + "; path=/";
	if (document.cookie.indexOf(chkcookie,0) < 0) {
  		return false;
  	}
  	return true;
}

/**
 * Nao deixa inserir mais que "maxlimit" caracteres no textarea
 * Author: Daniel Machado Reis 
 */
function textCounter(field, maxlimit) {
    if (field.value.length > maxlimit)
        field.value = field.value.substring(0, maxlimit);
}

/**
 * Abre o modal de login 
 * Author: Andre Araujo 
 */
function abrirLogin(){
	$(function() {
	    $( "#dialog-message" ).show();
	    $( "#dialog-message" ).dialog({
		modal: true,
		width:'600',
		height:'255',
		resizable:'false'
	    });
	});
}

/**
 * Abre o modal de login quando usuario solicitou denunciar uma piada 
 * Author: Daniel Machado Reis 
 */
function abrirLoginDenunciaPiada(){
	$(function() {
	    $( "#dialogLoginDenunciaPiada-message" ).show();
	    $( "#dialogLoginDenunciaPiada-message" ).dialog({
		modal: true,
		width:'600',
		height:'255',
		resizable:'false'
	    });
	});
}

/**
 * Abre o modal de login quando usuario solicitou denunciar um comentario 
 * Author: Daniel Machado Reis 
 */
function abrirLoginDenunciaComentario(){
	$(function() {
	    $( "#dialogLoginDenunciaComentario-message" ).show();
	    $( "#dialogLoginDenunciaComentario-message" ).dialog({
		modal: true,
		width:'600',
		height:'255',
		resizable:'false'
	    });
	});
}

/**
 * Codigo que "cria" o atributo maxlength para textareas :)
 */
$("textarea[maxlength]").keypress(function(event){
    var key = event.which;
 
    //todas as teclas incluindo enter
    if(key >= 33 || key == 13) {
        var maxLength = $(this).attr("maxlength");
        var length = this.value.length;
        if(length >= maxLength) {
            event.preventDefault();
        }
    }
});

/**
 * Pega o flash de uma pagina 
 * Author: Andre Silva
 */
function getFlashMovieObject(movieName){
	//import flash.system.Security;
	//System.security.loadPolicyFile("http://homologa.orapois.com.br/arquivos/animacoes/crossdomain.xml");
  	if (window.document[movieName]) 
  	{
      	return window.document[movieName];
  	}
  	if (navigator.appName.indexOf("Microsoft Internet")==-1)
  	{
    	if (document.embeds && document.embeds[movieName])
      	return document.embeds[movieName]; 
  	}
  	else // if (navigator.appName.indexOf("Microsoft Internet")!=-1)
  	{
    	return document.getElementById(movieName);
  	}
}
/**
 * Funco de espera em javascript
 * @param int milliseconds
 * @author: Andre Silva
 */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

/**
 * Funcao que pega a letra digitada (usando evento)
 * 
 * @param evt event
 * @return charStr varchar
 */
function getKeyPressed(evt){
    evt = evt || window.event;
    var charCode = evt.keyCode || evt.which;
    var charStr = String.fromCharCode(charCode);
    return charStr;
};