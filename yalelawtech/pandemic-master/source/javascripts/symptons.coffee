window.Symptons =
	sneezing:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	coughing:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	fever:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	sweating:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	vomiting:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	fatigue:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	diarreha:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	nausea:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	puloneary_edma:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	dementia:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	hypersensitivity:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	ataxia:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	kidney_failure:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	depression:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	hemorhaging:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	liver_failure:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	heart_failure:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	blindness:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	hypotonia:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1
	encephalitis:
		active: false
		buy:  3
		sell: 1
		data:
			lethality   : 1
			infectivity : 1
			visibility  : 1

toggle_sympton = (name)->
	Symptons[name].active = !Symptons[name].active
	if Symptons[name].active is true
		$(".#{name}").addClass    'active'
		Player.lethality.cur   += Symptons[name].data.lethality   if Symptons[name].data.lethality
		Player.infectivity.cur += Symptons[name].data.infectivity if Symptons[name].data.infectivity
		Player.visibility.cur  += Symptons[name].data.visibility  if Symptons[name].data.visibility
		console.log Player.lethality.cur
	else
		$(".#{name}").removeClass 'active'
		Player.lethality.cur   -= Symptons[name].data.lethality   if Symptons[name].data.lethality
		Player.infectivity.cur -= Symptons[name].data.infectivity if Symptons[name].data.infectivity
		Player.visibility.cur  -= Symptons[name].data.visibility  if Symptons[name].data.visibility
	

$('.sneezing').click         -> toggle_sympton 'sneezing'
$('.coughing').click         -> toggle_sympton 'coughing'
$('.fever').click            -> toggle_sympton 'fever'
$('.sweating').click         -> toggle_sympton 'sweating'
$('.vomiting').click         -> toggle_sympton 'vomiting'
$('.fatigue').click          -> toggle_sympton 'fatigue'
$('.diarreha').click         -> toggle_sympton 'diarreha'
$('.nausea').click           -> toggle_sympton 'nausea'
$('.puloneary_edma').click   -> toggle_sympton 'puloneary_edma'
$('.dementia').click         -> toggle_sympton 'dementia'
$('.hypersensitivity').click -> toggle_sympton 'hypersensitivity'
$('.ataxia').click           -> toggle_sympton 'ataxia'
$('.kidney_failure').click   -> toggle_sympton 'kidney_failure'
$('.depression').click       -> toggle_sympton 'depression'
$('.hemorhaging').click      -> toggle_sympton 'hemorhaging'
$('.liver_failure').click    -> toggle_sympton 'liver_failure'
$('.heart_failure').click    -> toggle_sympton 'heart_failure'
$('.blindness').click        -> toggle_sympton 'blindness'
$('.hypotonia').click        -> toggle_sympton 'hypotonia'
$('.encephalitis').click     -> toggle_sympton 'encephalitis'
