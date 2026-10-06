Feature: Play and edit modes

  Scenario: A saved character opens in play mode
    Given a saved character named "Éloïse Voss" with clan "Toreador", generation "10th", concept "Antiquarian", nature "Visionary" and demeanor "Bon Vivant"
    When the player opens that character from the roster
    Then the identity shows the name "Éloïse Voss" and the monogram "EV"
    And the identity summary reads "Toreador · 10th generation · Antiquarian"
    And the identity shows nature and demeanor as "Visionary / Bon Vivant"
    And no identity text field is offered

  Scenario: Ratings cannot be changed in play mode
    Given a saved character whose Strength is rated 2 and whose Brawl is rated 1
    And the player has that character's sheet open in play mode
    When the player clicks the fourth Strength dot and the fourth Brawl dot
    And the player presses the Tab key until focus has gone round the whole page once
    Then keyboard focus never landed on the Strength or Brawl rating
    And Strength reads "Strength 2 of 5" and Brawl reads "Brawl 1 of 5" to assistive technology
    And after reloading the sheet Strength is rated 2 and Brawl is rated 1

  Scenario: Entering edit mode makes the identity editable
    Given the player has a saved character's sheet open in play mode
    When they activate "Edit character"
    Then Name, Clan, Generation, Concept, Nature and Demeanor can be edited
    And there is no field for Player, Chronicle or Sire
    And the sheet is marked "Editing"
    And the edit button now reads "Done editing"
    And keyboard focus is on the Name field

  Scenario: Entering edit mode makes ratings editable
    Given a saved character whose Strength is rated 2
    And the player has that character's sheet open in play mode
    When they activate "Edit character"
    And they set Strength to 4
    Then Strength is rated 4

  Scenario: Leaving edit mode shows the edited values
    Given the player is editing a saved character
    When they enter "Lucita" as Name and set Strength to 4
    And they activate "Done editing"
    Then the identity shows the name "Lucita"
    And Strength is rated 4
    And no identity text field is offered
    And keyboard focus is on the "Edit character" button

  Scenario Outline: Done editing stays within reach
    Given the player is editing a saved character on a <width> by <height> pixel screen
    When they scroll to the bottom of the sheet
    Then the "Done editing" button is still visible
    And the last card on the sheet is fully visible

    Examples:
      | width | height |
      | 1512  | 900    |
      | 320   | 568    |

  Scenario: Edit mode does not survive a reload
    Given the player is editing a saved character
    When they set Dexterity to 3
    And they reload the sheet
    Then the sheet is in play mode
    And Dexterity is rated 3

  Scenario: A new character opens ready to edit
    When the player creates a new V20 character from the roster
    Then that character's sheet is in edit mode

  Scenario: A new character's sheet returns to play mode on reload
    Given the player created a new V20 character
    When they reload the sheet
    Then the sheet is in play mode

  Scenario: A new character reopened from the roster is in play mode
    Given the player created a new V20 character and returned to the roster
    When they open that character from the roster
    Then the sheet is in play mode

  Scenario: The mode change is announced
    Given the player has a saved character's sheet open in play mode
    When they activate "Edit character"
    Then assistive technology is told "Editing character"
    When they activate "Done editing"
    Then assistive technology is told "Play mode"

  Scenario: A character with no identity entered
    Given a saved character with no name, clan, generation, concept, nature or demeanor
    When the player opens that character from the roster
    Then the identity shows the name "Unnamed character" and no monogram letters
    And the identity shows no summary and no nature or demeanor

  Scenario Outline: The generation is worded for reading
    Given a saved character with clan "Brujah" and generation "<generation>"
    When the player opens that character from the roster
    Then the identity summary reads "<summary>"

    Examples:
      | generation | summary                  |
      | 10         | Brujah · 10th generation |
      | 3rd        | Brujah · 3rd generation  |
      | banana     | Brujah · banana          |
      |            | Brujah                   |

  Scenario: A long name does not break a narrow screen
    Given a saved character named "Maximilian Alexander von Hohenzollern-Sigmaringen the Younger"
    When the player opens that character on a 320 pixel wide screen
    Then the page does not scroll sideways
    And the whole name can be read

  Scenario: Values in hidden fields survive saving in either mode
    Given a saved character with "Ana" as Player, "Madrid by Night" as Chronicle, "Moncada" as Sire, three lines of Notes with leading spaces, a Weakness, an Experience value, a Bearing, a Bearing modifier and a Background "Resources" rated 2
    When the player opens that character and marks bashing damage on Bruised
    And they enter edit mode, enter "Lucita" as Name and reload the sheet
    Then the saved character still holds every one of those values exactly

  Scenario: No save status before anything changes
    Given the player has a saved character's sheet open in play mode
    Then the application bar shows no save status

  Scenario: A play-mode change is reported as saved
    Given the player has a saved character's sheet open in play mode
    When they mark bashing damage on Bruised
    Then the application bar shows "Saved"

  Scenario: An edit-mode change is reported as saved
    Given the player is editing a saved character
    When they set Stamina to 3
    Then the application bar shows "Saved"

  Scenario: A refused save is reported and then recovers
    Given the player is editing a saved character
    And the browser begins refusing to store changes
    When they set Stamina to 3
    Then the application bar shows "Changes not saved"
    And assistive technology is alerted that the browser refused to store the latest changes
    When the browser accepts changes again
    And they set Stamina to 4
    Then the application bar shows "Saved"

  Scenario: Nothing from the out-of-scope design is shown
    Given the player has a saved character's sheet open in play mode
    Then there is no tab bar, session label or settings control

  Scenario: A sheet address with no character still explains itself in the new look
    When the player opens the sheet address with no character id
    Then they see a "character not found" message with a link to the roster
    And the application bar is shown
