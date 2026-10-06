Feature: The character library lists everything stored

  @pending
  Scenario: A character is listed with its identity
    Given a saved character "Éloïse Voss" of clan "Toreador", generation "10", concept "Antiquarian", nature "Visionary", demeanor "Bon Vivant" and chronicle "The Glass City"
    When the player opens the roster
    Then the entry for "Éloïse Voss" shows the monogram "EV"
    And it shows "Toreador · 10th generation · Antiquarian"
    And it shows "Visionary / Bon Vivant" under "Nature / Demeanor"
    And it shows the chronicle "The Glass City"
    And it is not marked "In progress"

  @pending
  Scenario: A character with nothing filled in
    Given a saved character with nothing filled in
    When the player opens the roster
    Then the entry is named "Unnamed character"
    And its monogram is empty
    And it shows the chronicle "Unassigned"
    And it shows no summary line and no "Nature / Demeanor" label

  @pending
  Scenario: Only the details that are filled in are shown
    Given a saved character named "Lucita" with nature "Visionary" and a chronicle of three spaces
    When the player opens the roster
    Then the entry for "Lucita" shows "Visionary" under "Nature / Demeanor"
    And it shows no "/"
    And it shows no summary line
    And it shows the chronicle "Unassigned"

  @pending
  Scenario: Open sheet shows the character ready to play
    Given saved characters "Lucita" and "Fatima"
    When the player opens the roster
    And they follow "Open sheet" for "Fatima"
    Then the sheet for "Fatima" is shown in play mode

  @pending
  Scenario: Edit character opens the sheet for editing
    Given saved characters "Lucita" and "Fatima"
    When the player opens the roster
    And they follow "Edit character" for "Fatima"
    Then the sheet for "Fatima" is shown in edit mode

  @pending
  Scenario: Each entry's actions are named for its character
    Given saved characters "Lucita" and "Fatima"
    When the player opens the roster
    Then the open and edit actions of the two entries have four different accessible names
    And each name includes its character's name

  @pending
  Scenario: Two unnamed characters can be told apart
    Given two saved characters with nothing filled in, one created after the other
    When the player opens the roster
    Then the older entry is named "Unnamed character" and the newer "Unnamed character 2"
    And their open and edit actions have four different accessible names

  @pending
  Scenario: A build in progress is listed with characters
    Given a saved character named "Lucita"
    And a build in progress named "Beckett" of clan "Gangrel", concept "Wanderer", nature "Loner", demeanor "Scholar" and chronicle "The Glass City"
    When the player opens the roster
    Then the roster lists "Lucita"
    And the roster lists "Beckett" as in progress with clan "Gangrel"
    And the entry for "Beckett" shows the monogram "B", "Gangrel · Wanderer", "Loner / Scholar" and the chronicle "The Glass City"
    And the entry for "Beckett" offers "Continue" and neither "Open sheet" nor "Edit character"

  @pending
  Scenario: A build on its own is not an empty library
    Given a build in progress named "Beckett"
    When the player opens the roster
    Then the roster lists "Beckett" as in progress
    And the message that there are no characters yet is not shown

  @pending
  Scenario: An unreadable character is listed without actions
    Given a saved character named "Lucita"
    And a saved character whose data has been damaged
    When the player opens the roster
    Then the roster lists "Lucita"
    And the roster lists one unreadable character with an explanation that includes its record's id
    And the unreadable entry offers no action
    And the damaged data is exactly as it was

  @pending
  Scenario: An unreadable record on its own is not an empty library
    Given a saved character whose data has been damaged
    When the player opens the roster
    Then the roster lists one unreadable character
    And the message that there are no characters yet is not shown

  @pending
  Scenario: Stored text is shown as text
    Given a saved character named "<b>Lucita</b>" of clan "<i>Lasombra</i>" with chronicle "<u>Milan</u>"
    When the player opens the roster
    Then the entry shows the text "<b>Lucita</b>", "<i>Lasombra</i>" and "<u>Milan</u>"
    And the entry contains no bold, italic or underlined element

  @pending
  Scenario: The player's name is not shown
    Given a saved character named "Lucita" of clan "Lasombra" played by "Ana"
    When the player opens the roster
    Then "Ana" appears nowhere on the page

  Scenario: Nothing on the roster deletes
    Given a saved character, a build in progress, an unreadable character and an unreadable build
    When the player opens the roster
    Then no control on the page has "delete" or "remove" in its accessible name
    And the page contains no dialog

  @pending
  Scenario: Opening a sheet and coming back leaves what is stored untouched
    Given a saved character, a build in progress, an unreadable character and an unreadable build
    When the player opens the roster
    And they open the character's sheet and come back
    Then every stored record is exactly as it was

  @pending
  Scenario: The list counts what it shows
    Given a saved character, a build in progress and an unreadable build
    When the player opens the roster
    Then the summary row reads "Showing 3 of 3 characters"

  @pending
  Scenario: A restored page shows what was created since
    Given the player has the roster open with one saved character
    And a second character is saved from another page
    When the roster is restored from the browser's back and forward cache
    Then the roster lists 2 entries
