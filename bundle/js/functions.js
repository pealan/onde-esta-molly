var Base64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    }

}

/** 
 * Valida se a busca recebeu um parametro de ao menos 2 caracteres
 * Author: Andre Silva
 */
function validarFormularioBusca(){
    var busca = $.trim($("#inputBuscaHome").val());
	
    if(busca == "Buscar" || busca == "" || busca.length < 2){
        alert("Digite duas letras ou mais para efetuar uma busca!!");
        return false;
    }
	
}

function mascaraTexto(){
    if (event.keyCode >= 48 && event.keyCode <= 57){
        event.returnValue = false;
        return false;
    }
    return true;
}

/** 
 * Funcao que cadastra um email na maillist 
 * Author: Andre Silva
 */
function emailNewsCadastrar(fontsize){
    //Variaveis
    var email = $("#cadastroEmail").val();
    // Mudanca de Layout, nao tem mais checkbox
    //var aceitaBoletimParceiros = document.getElementById("checkbox-email").checked == true? 1:0;
    //var data = "email=" + email + "&aceitaBoletimParceiros=" + aceitaBoletimParceiros;
    var data = "email=" + email + "&aceitaBoletimParceiros=1";
    //Validacao
    if(!isEmail(email)){
        alert("E-mail inv\u00E1lido!");
        $("#cadastroEmail").focus();
        return false;
    }
    //Se estiver ok, faz o cadastro e atualiza a div
    else{
        $("#CadastroMailCampos").html("<center><img src='images/ajax-loader.gif'/></center>");
        $.ajax({
            //this is the php file that processes the data and send mail
            url: "ajax/cadastrarMailList.php", 

            //pass the data         
            data: data, 

            //Json
            dataType: "json",
		
            //Do not cache the page
            cache: false,
		
            //success
            success: function (retorno) {      
                $("#CadastroMailCampos").html("<p style='font-size:11px!important; background-image:none !important;'>" + retorno.mensagem + "</p>");
            },
        //error
        /*
		error: function(){
			alert("Ocorreu um erro durante o cadastro. Atualize a pagina e tente novamente!");
			return false;
		} 
		*/		
        });
    }
}

/**
 * Abaixo estao as funcoes da TV da HOME e HUMOR NA REDE
 * Author: Andre Araujo 
 */
var timeoutTV_home = new Array();
function ativarTvHome(numeroItem){
    //Limpa um timeout se estiver ativado
    clearTimeout(timeoutTV_home[0]);
    clearTimeout(timeoutTV_home[1]);
    //Se o numero estiver fora de faixa, cai no 0 de novo
    //if((numeroItem < 0) || (numeroItem > 3) ||(numeroItem == null)) numeroItem = 0; //Comentado. Ao tirar a imagem do app na tv, descomentar essa linha e comentar a de baixo
    if((numeroItem < 0) || (numeroItem > 4) ||(numeroItem == null)) numeroItem = 0;
    //Esconde todas as divs e exibe apenas a certa
    abrirThumbTv(numeroItem);
    //Timeout para chamar a funcao de novo
    timeoutTV_home[0] = setTimeout('ativarTvHome('+(parseInt(numeroItem) + parseInt(1))+');', 	5000);
}
/**
 * Abre um item da tv
 * Author: Andre Araujo 
 */
function abrirThumbTv(item){
    var itemApagar = 0;
    while(document.getElementById("thumbTvHome" + itemApagar)){
        $("#thumbTvHome" + itemApagar).hide();
        itemApagar ++;
    }
    //Aparecendo o proximo
    $("#thumbTvHome" + item).fadeIn(1200);
    //Timeout para sumir depois
    timeoutTV_home[1] = setTimeout("$('#thumbTvHome" + item + "').fadeOut(1200)", 4000);
}
/**
 * Destacar os inputs ao dar foco
 * Author: Andre Araujo 
 */
function inputDestacar(){
    //Ao dar foco nos campos deixa eles com borda colorida
    $('input:text').focus(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid #35ABFF");

    });

    $("textarea").focus(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid #35ABFF");

    });

    $('input:text').blur(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid white");

    });

    $("textarea").blur(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid white");

    });

    $('input:text').each(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid white");

    });

    $("textarea").each(function() {
        // do something exciting with each div
        $(this).css("border", "2px solid white");

    });
	
}

/**
 * Funcao que starta o slideshow de quadrinhos
 * Author: Andre Araujo 
 */
var timeoutEXIBICAO_quadrinhos = new Array();
function QUADRINHOS__start(numeroitem, keepButtons){
    //Limpa o timeout
    clearTimeout(timeoutEXIBICAO_quadrinhos[0]);
    //Apaga todos
    listaQuadrinhos = $('.divQuadrinhoExibir');
    $('.divQuadrinhoExibir').hide();
    //Exibe o atual com fadein. Se ja estiver exibindo o mesmo, nao da o fadein
    $('#divQuadrinho' + numeroitem).show();
    //Conta o total de itens e pega o proximo
    var total = $('.divQuadrinhoExibir').length;
    var next = QUADRINHOS__next();
    //Habilita o voltar e o avancar
    if(!(keepButtons == 1)){
        document.getElementById("quadrinhoBotaoVoltar").disabled = "disabled";
        document.getElementById("quadrinhoBotaoAvancar").disabled = "disabled";
        document.getElementById("quadrinhoBotaoControle").value = "parar";
        document.getElementById("quadrinhoBotaoControle").onclick = function(e){
            QUADRINHOS_stop()
        };
        //Chama o proximo depois de alguns segundos
        timeoutEXIBICAO_quadrinhos[0] = setTimeout("QUADRINHOS__start(" + next + ")", 5000);
    }
	
}
/**
 * Funcao que pega o proximo item do slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS__next(){
    var retorno = 0;
    var next = parseInt(QUADRINHOS__current()) + parseInt(1);
    if(document.getElementById('divQuadrinho' + next)) retorno = next;
    return retorno;
}
/**
 * Funcao que pega o item anterior do slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS__last(){
    var retorno = ($('.divQuadrinhoExibir').length) - 1;
    var next = parseInt(QUADRINHOS__current()) - parseInt(1);
    if(document.getElementById('divQuadrinho' + next)) retorno = next;
    return retorno;
}
/**
 * Funcao que para o slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS_stop(){
    //Cancela o timeout
    clearTimeout(timeoutEXIBICAO_quadrinhos[0]);
    //Habilita o voltar e o avancar
    document.getElementById("quadrinhoBotaoVoltar").disabled = "";
    document.getElementById("quadrinhoBotaoAvancar").disabled = "";
    document.getElementById("quadrinhoBotaoControle").value = "continuar";
    document.getElementById("quadrinhoBotaoControle").onclick = function(e){
        QUADRINHOS__start(QUADRINHOS__current())
    };
}
/**
 * Funcao que para o slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS__current(){
    //Inicializacoes
    var current = '0';
    //For
    for(var i = 0; i < $('.divQuadrinhoExibir').length; i++){
        if(document.getElementById('divQuadrinho' + i).style.display != 'none') current = i;
    }
    //Retorna o atual
    return current;
}
/**
 * Funcao que abre o proximo do slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS__openNext(){
    QUADRINHOS__start(QUADRINHOS__next(),1);
}
/**
 * Funcao que abre o anterior do slideshow
 * Author: Andre Araujo 
 */
function QUADRINHOS__openLast(){
    QUADRINHOS__start(QUADRINHOS__last(),1);
}

/**
 * Retirar a frase do dia e colocar um campo de texto para usuario enviar sua sugestao de frase do dia
 */
function sugerirFrase() {
    $('.tooltip').remove();
    var campoFrase = $("#fraseHeader");
    var html = "";
	
    html += "<div class='icon-gc'>";
    html += "<img src='images/smile.png' width='15' height='16' />";
    html +=	"</div>";
    html += "<p class='txt-gc2'>Insira sua Frase:</p>";
    html += "<div id='frase-gc'>";
    html += "<input type='text' class='frase-input' id='inputSugestaoFrase' maxlength='87' onblur='textCounterFraseDia(this,86)' onkeypress='textCounterFraseDia(this,86)' />&nbsp;";
    html += "<div id='btn_inserir'>";
    html += "<input type='button' id='botaoEnviarFrase' onclick='enviarFrase()' class='botao-inserir' value='' />";
    html += "</div>";
    html += "</div>";

    campoFrase.html(html);
}

/**
 * Envia por ajax a frase do dia que o usuario sugeriu
 */
function enviarFrase() {
    var campoFrase = $("#fraseHeader");
    var fraseSugerida = $.trim($("#inputSugestaoFrase").val());
    if(fraseSugerida.length < 10) {
        alert("Calma aí cabeção. Você precisa inserir o mínimo de 10 caracteres!");
    } else if(fraseSugerida.length > 86) {
        alert("Muito mi-mi-mi pra uma frase só. Sua frase pode ter no máximo 86 caracteres!");
    } else {
        var html = "<p class='txt-gcfim'>";
	
        $.post("ajax/enviarFraseSugerida.php", 
        {
            frase: fraseSugerida
        },
        function (data) {
            // Insercao com sucesso, sem erro
            if(data.sucesso == true) {
                html += "Obrigado pela sugestão! A qualquer momento sua frase poderá aparecer por aqui!";
                html += "</p>";
                campoFrase.html(html);
            } else {
                html += "Houve um erro e sua sugestão não foi enviada. Por favor, tente novamente";
                html += "</p>";
                campoFrase.html(html);
            }
        },
        "json"
        );	
    }
}

/*
 * Nao deixa inserir mais que "maxlimit" caracteres no textarea
 *
 * Author: Daniel Machado Reis 
 */
function textCounterFraseDia(field, maxlimit) {
    if (field.value.length > maxlimit) {
        alert("Muito mi-mi-mi pra uma frase só. Sua frase pode ter no máximo 86 caracteres!");
        field.value = field.value.substring(0, maxlimit);
    }
}

/*
 * Verifica se a letra que o usuario digitou eh a correta no cornograma
 *
 * Author: Daniel Machado Reis 
 */
function verificaLetraCorreta(elementoId, e) {
    var letraColocada = getKeyPressed(e).toUpperCase();
    elemento = $("#"+elementoId);
    $("#" + elementoId).val(letraColocada);
    var hyt = $("#" + elementoId).attr("hyt");
	
    $.post("ajax/verificaLetraCorretaAjax.php", 
    {
        hyt: hyt, 
        letraColocada: letraColocada
    },
    function (data) {
        // Letra colocada corretamente
    	elemento.val(letraColocada);
        //console.log("Letra colocada: " + letraColocada);
        //console.log("Elemento: " + $("#" + elementoId).val());
        if(data.letraCorreta == true) {
           
            var corBorda = $("#" + elementoId).css("background-color");
           $("#" + elementoId).css("border", "1px solid gray");
            $("#" + elementoId).css("padding", "4px 9px");
            $("#" + elementoId).attr("disabled", "");
            setTimeout("$('#" + elementoId+ "').val('" + letraColocada+ "');", 200);
            var ordem = $("#" + elementoId).attr("ordem");
            var next = $("#" + elementoId).next('input');
            
            var lista = $(".cornogramaDivLetra");
            for(i = 0; i < (lista.length); i++){
                if(i == (lista.length - 1) && lista[i].id == elementoId) next = $("#cadastroEmail");
            }
            
            next.focus();
            $("#perguntaQuiz > div").each(function () { 
                if ($(this).attr("ordem") == ordem){
                    var letra = Base64.decode($(this).attr("dwr"));
                    $(this).html(letra);
                } 
            });
            if(data.fimJogo == true){
                cornogramaFinalModal(data.pontuacao, data.fraseCompleta);
            }
        } else {
            $("#" + elementoId).css("border", "2px solid red");
            $("#" + elementoId).css("padding", "3px 8px");
            setTimeout("$('#" + elementoId+ "').val('');", 200);
        }
        //Atualiza a pontuacao
        $("#cornogramaPontuacao").html("&nbsp;|&nbsp;" + data.pontuacao + " pontos");
    },
    "json"
    );
}

function sleep2(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

/**
 * Funcao que exibe o modal de curtir o facebook na home
 */ 
function modalHumortadelaFacebook(){
     $("#modalFacebook").dialog({
        modal: true,
        resizable:false,
        width:'500',
        height:'240'
    });
	
}

function abrirPaginaFacebook(){
     window.open("http://www.facebook.com/humortadela","_target='blank'");
     $("#modalFacebook").dialog("close");
}

// Variaveis de configuracao
var DEaff="parhumortadela";	// Affiliate
var DEchan="";		// Canal quando existe
var DEsubc="capa";	// Subcanal capa ou outros.
var Expble=1;		// Alterar para 0 se não houver 240 pixels de espaço abaixo do 468x60 até o final da pagina
var DEcmpng=1;		// Alterar para 1 se participa de qualquer campanha vendida pelo UOL "cmpng"
var DEGroup=6;		// Grupo de afinidade "group"
// Fim da configuracao


/* NAO ALTERAR DAQUI PARA BAIXO, apenas remova os comentarios se precisar.
A linha abaixo deve obrigatoriamente ficar fora da função o valor de
"DErand" nao pode ser diferente para os banners de uma mesma pagina */
d=document;
var DEt=new Date();
DEt=DEt.getTime();
DErand=Math.floor(DEt*1000*Math.random());

// Verifica resolucao de tela
var scw=0,sch=0;
if(screen.height){
    scw=screen.width;
    sch=screen.height;
}

// Funcao que exibe o banner
function DEshow(ad,pos){
    // Verifica tipo de conexao do usuario
    var DEconn=d.body;
    DEconn.style.behavior='url(#default#clientCaps)';
    DEconn=(DEconn.connectionType=='lan')?1:0;
    d.write('<scr'+'ipt language="JavaScript1.1" src="http://bn.uol.com.br/js.ng/site=par&chan='+DEchan+'&subchan='+DEsubc+'&affiliate='+DEaff+'&size='+ad+'&page='+pos+'&conntype='+DEconn+'&expble='+Expble+'&reso='+scw+'x'+sch+'&cmpng='+DEcmpng+'&group='+DEGroup+'&tile='+DErand+'?"></scr'+'ipt>');
}



