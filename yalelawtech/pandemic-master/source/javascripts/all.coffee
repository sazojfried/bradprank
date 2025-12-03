#= require 'd3'
#= require 'topojson'
#= require 'datamaps'
#= require 'player'
#= require 'countries'
#= require 'symptons'
#= require 'nav'

WATCH          = false
START          = 0

days         = 0
ev_points    = 0
done         = false

timers = {}
every = (key,sec,callback) ->
  timers[key] ||=
    watch : false
    start : 0

  if timers[key].watch is true
    csec = Math.round ((new Date).getTime() - timers[key].start)/1000
    if csec >= sec
      callback()
      timers[key].watch = false
  else
    timers[key].start = (new Date).getTime()
    timers[key].watch = true

totals =
  population : 0
  infected   : 0
  deaths     : 0

window.Indexes = []
for name,values of Countries
 Indexes.push name

for name,values of Countries
 Countries[name].data =
    graph      : null
    population : []
    infected   : []
    deaths     : []
    init_population: values.population


i = Math.floor(Math.random()*173)
Countries[Indexes[i]].infected = 1

chance_of_spread = (name)->
  infected  = Math.floor(Math.random()*(Player.infectivity.cur+1))
  potential = Countries[name].population-Countries[name].infected
  return potential if potential < infected
  infected
chance_of_death = (name)->
  return unless Countries[name].infected > 0
    #chance_lethality = Math.floor Math.random()*(Player.lethality.max+1)
    #death_occurs     = chance_lethality <= Player.lethality.cur
    #if death_occurs
      #chance_severity = Math.floor Math.random()*(Player.severity.cur+1)

      #deaths = Math.floor Math.random()*(Countries[name].infected+1)
      #Countries[name].infected   -= deaths
      #Countries[name].population -= deaths
      #Countries[name].deaths     += deaths

update_game = ->
  totals.population = 0
  totals.infected   = 0
  totals.deaths     = 0
  for name,values of Countries
    Countries[name].infected += chance_of_spread name
    chance_of_death  name
    totals.population += Countries[name].population
    totals.infected   += Countries[name].infected
    totals.deaths     += Countries[name].deaths
    unless Countries[name].population is 0
      Countries[name].data.population.push Countries[name].population
      Countries[name].data.infected.push   Countries[name].infected
      Countries[name].data.deaths.push     Countries[name].deaths
  days++
  if totals.population is 0
    done = true
    $('.win_game').addClass 'active'

redraw_sparklines = ->
  for name in Indexes.slice((window.Page-1)*20,window.Page*20)
    init_population = Countries[name].data.init_population

    range_x = d3.scale.linear().range([0, 500]).domain([0, 500])
    range_y = d3.scale.linear().range([0, 20]).domain([init_population, 0])
    line    = d3.svg.line()
      .x((d,i)-> range_x i)
      .y((d)  -> range_y d)
    Countries[name].data.graph = d3.select(".graph_#{name}").append("svg:svg").attr("width", "100%").attr("height", "100%")
    Countries[name].data.graph.append("svg:path").attr('class','population').attr "d", line(Countries[name].data.population)
    Countries[name].data.graph.append("svg:path").attr('class','infected').attr   "d", line(Countries[name].data.infected)
    Countries[name].data.graph.append("svg:path").attr('class','deaths').attr     "d", line(Countries[name].data.deaths)

generate_country = (country_name)->
  values = Countries[country_name]
  #columns = 'airport shipyard hospital border transit school'.split ' '
  #for column in columns
    #switch values[column]
      #when true  then $(".#{country_name} .#{column}").removeClass('false null').addClass('true')
      #when false then $(".#{country_name} .#{column}").removeClass('true null').addClass('false')
      #when null  then $(".#{country_name} .#{column}").removeClass('true false').addClass('null')

  row = document.createElement 'tr'
  row.className = 'country'

  name       = document.createElement 'td'
  population = document.createElement 'td'
  infected   = document.createElement 'td'
  deaths     = document.createElement 'td'
  airport    = document.createElement 'td'
  hospital   = document.createElement 'td'
  shipyard   = document.createElement 'td'
  transit    = document.createElement 'td'
  border     = document.createElement 'td'
  school     = document.createElement 'td'
  ticker     = document.createElement 'td'
  graph      = document.createElement 'div'

  name.className       = 'name'
  population.className = 'population'
  infected.className   = 'infected'
  deaths.className     = 'deaths'
  airport.className    = 'airport'
  hospital.className   = 'hospital'
  shipyard.className   = 'shipyard'
  transit.className    = 'transit'
  border.className     = 'border'
  school.className     = 'school'
  ticker.className     = 'ticker'
  graph.className      = "graph graph_#{country_name}"

  name.appendChild        document.createTextNode values.name
  population.appendChild  document.createTextNode values.population
  infected.appendChild    document.createTextNode values.infected
  deaths.appendChild      document.createTextNode values.deaths
  ticker.appendChild      graph

  el1 = document.createElement('span')
  el2 = document.createElement('span')
  el3 = document.createElement('span')
  el4 = document.createElement('span')
  el5 = document.createElement('span')
  el6 = document.createElement('span')

  el1.className = 'fa fa-plane'
  el2.className = 'fa fa-plus'
  el3.className = 'fa fa-anchor'
  el4.className = 'fa fa-truck'
  el5.className = 'fa fa-shield'
  el6.className = 'fa fa-user'

  airport.appendChild  el1
  hospital.appendChild el2
  shipyard.appendChild el3
  transit.appendChild  el4
  border.appendChild   el5
  school.appendChild   el6

  row.appendChild        name
  row.appendChild  population
  row.appendChild    infected
  row.appendChild      deaths
  row.appendChild     airport
  row.appendChild    hospital
  row.appendChild    shipyard
  row.appendChild     transit
  row.appendChild      border
  row.appendChild      school
  row.appendChild      ticker
  row

window.Page = 1
$('.step_kind .kind').click ()->
  $('.choose_kind .kind').removeClass 'active'
  $(this).addClass 'active'
  window.Player.disease_kind = parseInt $(this).attr 'kind'
$('.step_kind .next').click ()->
  $('.step_kind').hide()
  $('.step_name').show()
  $('.step_name input').focus()
$('.step_name .next').click ()->
  name = $('.step_name input').val()
  window.Player.disease_name = name
  $('.setup').hide()
  draw_game()
  window.GameStart = true

$('.fa-chevron-circle-up').click ()->
  unless window.Page is 1
    window.Page--
    $('.paginate span.cur').html window.Page
    draw_game()
$('.fa-chevron-circle-down').click ()->
  unless window.Page is 9
    window.Page++
    $('.paginate span.cur').html window.Page
    draw_game()

draw_game   = ->
  $('.days .value').html days
  $('.define .disease_kind').html window.Player.disease_kind_name()
  $('.define .disease_name').html window.Player.disease_name
  frag = document.createDocumentFragment()
  for name in Indexes.slice((window.Page-1)*20,window.Page*20)
    frag.appendChild generate_country name
  $('.countries tbody').html frag

  $(".total .population").html totals.population
  $(".total .infected").html   totals.infected
  $(".total .deaths").html     totals.deaths

  $('.evolution_points .value').html window.Player.evolution_points
  redraw_sparklines()
draw_pills =->
  $('.stat.lethality .pill').width   "#{(Player.lethality.cur/Player.lethality.max)*100}%"
  $('.stat.infectivity .pill').width "#{(Player.infectivity.cur/Player.infectivity.max)*100}%"
  $('.stat.visibility .pill').width  "#{(Player.visibility.cur/Player.visibility.max)*100}%"
render_map = ->
  data = {}
  for name,values of Countries
    per = Math.floor ((values.infected+values.deaths)/(values.population+values.deaths))*100
    fill = switch
      when per <= 5   then null
      when per <= 10  then 10
      when per <= 20  then 20
      when per <= 30  then 30
      when per <= 40  then 40
      when per <= 50  then 50
      when per <= 60  then 60
      when per <= 70  then 70
      when per <= 80  then 80
      when per <= 90  then 90
      when per <= 100 then 100
    data[name] =
      fillKey: fill
  map_options =
    projection: 'mercator'
    geographyConfig:
      borderColor : '#282828'
      popupOnHover: false
      highlightOnHover: false
    data: data
    fills:
      defaultFill : '#0f172a'
      10          : '#e0f2fe'
      20          : '#bfdbfe'
      30          : '#93c5fd'
      40          : '#60a5fa'
      50          : '#3b82f6'
      60          : '#2563eb'
      70          : '#1d4ed8'
      80          : '#1e40af'
      90          : '#1e3a8a'
      100         : '#020617'
  $('.map').html('').datamaps map_options

data = {}
for country in Datamap.prototype.worldTopo.objects.world.geometries
  data[country.id] = 
    name: country.properties.name

mainloop = ->
  unless done
    setTimeout ->
      mainloop()
      if GameStart
        unless Pause
          every 'ev', Speed*10, ->
            window.Player.evolution_points++
          every 'day', Speed, ->
            update_game()
            draw_game()
            render_map()
            draw_pills()
    , (1000/60)
mainloop()
