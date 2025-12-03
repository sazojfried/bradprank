window.Player =
  evolution_points: 10
  disease_name: ''
  disease_kind: 1
  disease_kind_name: ->
    switch window.Player.disease_kind
      when 1 then 'Algorithm'
      when 2 then 'Platform Culture'
      when 3 then 'Loneliness'
  lethality:
    cur : 0
    max : 20
  infectivity:
    cur : 0
    max : 20
  visibility:
    cur : 0
    max : 20
	severity:
		cur: 0
		max: 10
