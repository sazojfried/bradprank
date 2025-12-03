window.GameStart = false
window.Pause = false
window.Speed = 2
nav     = 'disease'
columns = 'disease stats map'.split ' '

tabs =
  disease: ->
    $('.tab').removeClass 'active'
    $('.tab_disease').addClass 'active'
    $('body').removeClass 'state_disease state_stats state_map'
    $('body').addClass 'state_disease'
  stats: ->
    $('.tab').removeClass 'active'
    $('.tab_stats').addClass 'active'
    $('body').removeClass 'state_disease state_stats state_map'
    $('body').addClass 'state_stats'
  map: ->
    $('.tab').removeClass 'active'
    $('.tab_map').addClass 'active'
    $('body').removeClass 'state_disease state_stats state_map'
    $('body').addClass 'state_map'

$('.tab_disease').click tabs.disease
$('.tab_stats').click   tabs.stats
$('.tab_map').click     tabs.map

$(document).keydown (e) ->
  return unless e.keyCode is 37 ||
                e.keyCode is 39 ||
                e.keyCode is 13 ||
                e.keyCode is 32
  switch e.keyCode
    when 13 #return
      $('.speeds .fa').removeClass 'active'
      if window.Pause
        window.Pause = false
        if window.Speed is 0
          $('.speeds .fa-forward').addClass 'active'
        else
          $('.speeds .fa-play').addClass 'active'
      else
        if window.Speed is 0
          window.Speed = 2
          $('.speeds .fa-play').addClass 'active'
        else
          window.Speed = 0
          $('.speeds .fa-forward').addClass 'active'
    when 32 #space
      $('.speeds .fa').removeClass 'active'
      window.Pause = !window.Pause
      if window.Pause
        $('.speeds .fa-pause').addClass 'active'
      else
        if window.Speed is 0
          $('.speeds .fa-forward').addClass 'active'
        else
          $('.speeds .fa-play').addClass 'active'
    when 37 #left
      i   = columns.indexOf nav
      nav = columns[i-1]
      nav = columns[2] if i is 0
      tabs[nav]()
    when 39 #right
      i   = columns.indexOf nav
      nav = columns[i+1]
      nav = columns[0] if i is 2
      tabs[nav]()

$('.fa-pause').click ->
  $('.speeds .fa').removeClass 'active'
  $('.speeds .fa-pause').addClass 'active'
  window.Pause = true
$('.fa-play').click ->
  $('.speeds .fa').removeClass 'active'
  $('.speeds .fa-play').addClass 'active'
  window.Speed = 2
  window.Pause = false
$('.fa-forward').click ->
  $('.speeds .fa').removeClass 'active'
  $('.speeds .fa-forward').addClass 'active'
  window.Speed = 0
  window.Pause = false

