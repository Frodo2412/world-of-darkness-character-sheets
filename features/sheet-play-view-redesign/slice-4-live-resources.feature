Feature: Live resources

  Scenario Outline: The blood pool maximum follows the generation
    Given a saved character with generation "<generation>" and 3 blood
    When the player opens that character from the roster
    Then the Blood Pool reads "3 / <maximum>"

    Examples:
      | generation | maximum |
      | 13th       | 10      |
      | 10th       | 13      |
      | 8          | 15      |
      | 4          | 50      |

  Scenario: An unreadable generation falls back and says so
    Given a saved character with generation "banana" and 3 blood
    When the player opens that character from the roster
    Then the Blood Pool reads "3 / 50"
    And the Blood Pool card says "Generation not recognised · maximum assumed 50"

  Scenario: The blood tracker draws one segment per point for small pools
    Given a saved character with generation "10th" and 8 blood
    When the player opens that character from the roster
    Then the blood tracker shows 13 segments with 8 filled

  Scenario: The blood tracker becomes a single bar for large pools
    Given a saved character with generation "4" and 25 blood
    When the player opens that character on a 320 pixel wide screen
    Then the blood tracker is one bar filled to half its length
    And the page does not scroll sideways

  Scenario: Spending and gaining blood in play mode
    Given a saved character with generation "10th" and 8 blood
    And the player has that character's sheet open in play mode
    When they spend one blood
    Then the Blood Pool reads "7 / 13"
    When they gain one blood
    Then the Blood Pool reads "8 / 13"

  Scenario: Blood cannot go below zero and focus stays put
    Given a saved character with generation "10th" and 1 blood
    And the player has that character's sheet open in play mode
    When they move keyboard focus to "Spend one blood" and press Enter twice
    Then the Blood Pool reads "0 / 13"
    And "Spend one blood" is reported as unavailable
    And keyboard focus is still on "Spend one blood"

  Scenario: Blood cannot go above the maximum
    Given a saved character with generation "10th" and 13 blood
    When the player opens that character from the roster
    Then "Gain one blood" is reported as unavailable
    When they activate "Gain one blood"
    Then the Blood Pool reads "13 / 13"

  Scenario: Stored blood above the maximum is shown as stored
    Given a saved character with generation "10th" and 20 blood
    When the player opens that character from the roster
    Then the Blood Pool reads "20 / 13" and is marked "over maximum"
    And the blood tracker is completely filled
    And "Gain one blood" is reported as unavailable
    When they spend one blood
    Then the Blood Pool reads "19 / 13"

  Scenario: Changing the generation changes the maximum without an announcement
    Given the player is editing a saved character with generation "13" and 5 blood
    When they enter "8" as Generation
    Then the Blood Pool reads "5 / 15"
    And assistive technology was told nothing about the Blood Pool

  Scenario: Blood per turn is shown only when recorded
    Given a saved character whose blood per turn is "1"
    And another saved character with no blood per turn recorded
    When the player opens each character from the roster
    Then the first Blood Pool card shows "1 blood / turn"
    And the second shows no per-turn text

  Scenario: Blood per turn can be edited
    Given the player is editing a saved character
    When they enter "3" as Blood per turn and reload the sheet
    Then the Blood Pool card shows "3 blood / turn"

  Scenario: Blood per turn cannot be changed in play mode
    Given the player has a saved character's sheet open in play mode
    Then no Blood per turn field is offered

  Scenario: Spending and regaining willpower
    Given a saved character with permanent Willpower 6 and temporary Willpower 4
    And the player has that character's sheet open in play mode
    Then Willpower reads "4 / 6" with 4 of 6 dots filled
    When they spend one willpower
    Then Willpower reads "3 / 6"
    When they regain one willpower
    Then Willpower reads "4 / 6"

  Scenario Outline: Temporary willpower is bounded
    Given a saved character with permanent Willpower <permanent> and temporary Willpower <temporary>
    When the player opens that character from the roster
    Then "Spend one willpower" is <spend>
    And "Regain one willpower" is <regain>

    Examples:
      | permanent | temporary | spend       | regain      |
      | 6         | 6         | available   | unavailable |
      | 6         | 0         | unavailable | available   |
      | 0         | 0         | unavailable | unavailable |

  Scenario: Stored temporary willpower above permanent is shown as stored
    Given a saved character with permanent Willpower 3 and temporary Willpower 8
    When the player opens that character from the roster
    Then Willpower reads "8 / 3" and is marked "over maximum"
    And "Regain one willpower" is reported as unavailable
    When they spend one willpower
    Then Willpower reads "7 / 3"

  Scenario: Permanent willpower is changed only while editing
    Given a saved character with permanent Willpower 6 and temporary Willpower 4
    And the player has that character's sheet open in play mode
    Then permanent Willpower cannot be changed
    When they activate "Edit character" and set permanent Willpower to 3
    Then Willpower reads "4 / 3"

  Scenario Outline: The health card names the current wound level
    Given a saved character with lethal damage on <levels>
    When the player opens that character from the roster
    Then the Health heading shows "<wound>"

    Examples:
      | levels                    | wound              |
      | Bruised                   |                    |
      | Hurt                      | Hurt · −1 die      |
      | Hurt and Crippled         | Crippled · −5 dice |
      | Bruised and Incapacitated | Incapacitated      |

  Scenario: The wound level follows the health track and is announced
    Given the player has a saved, unwounded character's sheet open in play mode
    When they mark bashing damage on Wounded
    Then the Health heading shows "Wounded · −2 dice"
    And assistive technology is told "Wounded, minus 2 dice"
    When they mark Wounded until it is empty
    Then the Health heading shows no wound

  Scenario: The health legend names each mark
    Given the player has a saved character's sheet open in play mode
    Then the health legend lists "Bashing", "Lethal" and "Aggravated" in that order
    And each legend entry shows its own mark image, and no two entries share one

  Scenario: Resources and health are saved
    Given a saved character with generation "10th", 8 blood, permanent Willpower 6 and temporary Willpower 4
    And the player has that character's sheet open in play mode
    When they spend one blood, spend one willpower, mark bashing damage on Bruised, lethal on Hurt and aggravated on Injured
    And they reload the sheet
    Then the Blood Pool reads "7 / 13" and Willpower reads "3 / 6"
    And Bruised shows bashing, Hurt shows lethal and Injured shows aggravated damage

  Scenario: Resources stay live while editing
    Given the player is editing a saved character with generation "10th" and 8 blood
    When they spend one blood and mark bashing damage on Bruised
    Then the Blood Pool reads "7 / 13" and Bruised shows bashing damage

  Scenario: Humanity is shown as a number, dots and a path
    Given a saved character with Humanity 7 on the path "Path of Humanity"
    And another saved character with Humanity 5 and no path name
    When the player opens each character from the roster
    Then the first Humanity card shows the number 7, 7 of 10 dots filled and "Path of Humanity"
    And the second shows the number 5 and no path name

  Scenario: Humanity is changed only while editing
    Given a saved character with Humanity 7
    And the player has that character's sheet open in play mode
    Then the Humanity rating cannot be changed and no path name field is offered
    When they activate "Edit character", set Humanity to 6 and enter "Path of Night" as the path name
    Then no field for Bearing or Bearing modifier is offered
    When they reload the sheet
    Then the Humanity card shows the number 6 and "Path of Night"

  Scenario: A resource change is announced once
    Given a saved character with generation "10th" and 8 blood
    And the player has that character's sheet open in play mode
    When they spend one blood using the keyboard
    Then assistive technology is told "Blood Pool 7 of 13"
