Feature: Disciplines and Virtues cards

  Scenario: Named Disciplines are listed in play mode
    Given a saved character with the Disciplines "Presence" rated 3, "Auspex" rated 2 and "Obfuscate" rated 0, and a fourth Discipline named with only spaces
    When the player opens that character from the roster
    Then the Disciplines card lists "Presence 3", "Auspex 2" and "Obfuscate 0" in that order
    And no other Discipline row is shown

  Scenario: A Discipline lists the powers its rating reaches, with their dice
    Given a saved character with Charisma 3, Appearance 3, Performance 3, Intimidation 1, Empathy 2 and the Disciplines "Presence" rated 3 and "Auspex" rated 2
    When the player opens that character from the roster
    Then "Presence" lists the powers "Awe", "Dread Gaze" and "Entrancement"
    And the power "Awe" shows "Charisma 3 + Performance 3" and "6 dice"
    And the power "Dread Gaze" shows "Charisma 3 + Intimidation 1" and "4 dice"
    And the power "Entrancement" shows "Appearance 3 + Empathy 2" and "5 dice"

  Scenario: Only the first Discipline starts open
    Given a saved character with Charisma 3, Appearance 3, Performance 3, Intimidation 1, Empathy 2 and the Disciplines "Presence" rated 3 and "Auspex" rated 2
    When the player opens that character from the roster
    Then the powers of "Presence" are shown and the powers of "Auspex" are not
    When they open the Discipline "Auspex"
    Then the power "Heightened Senses" shows "No roll" and no dice
    And the power "Aura Perception" shows "Perception 1 + Empathy 2" and "3 dice"

  Scenario: Wounds reduce a power's dice, and an open Discipline stays open
    Given a saved character with Charisma 3, Appearance 3, Performance 3, Intimidation 1, Empathy 2 and the Disciplines "Presence" rated 3 and "Auspex" rated 2
    And the player has that character's sheet open in play mode
    When they open the Discipline "Auspex"
    And they mark lethal damage on Hurt
    Then the power "Awe" shows "Charisma 3 + Performance 3 − wound 1" and "5 dice"
    And the power "Aura Perception" shows "Perception 1 + Empathy 2 − wound 1" and "2 dice"

  Scenario: A Discipline the app does not know has no powers to open
    Given a saved character with the Discipline "Flight" rated 1
    When the player opens that character from the roster
    Then the Disciplines card lists "Flight 1"
    And the Disciplines card shows no power list and no expand control

  Scenario: A character with no Disciplines
    Given a saved character with no Discipline named
    When the player opens that character from the roster
    Then the Disciplines card says "No Disciplines recorded · edit character to add"

  Scenario: Disciplines are written in while editing
    Given the player is editing a saved character with no Discipline named
    Then the Disciplines card offers six rows, each with a name and a rating
    When they name the first Discipline "Dominate" with 3 dots
    And they reload the sheet
    Then the Disciplines card lists "Dominate 3"

  Scenario: Clearing a Discipline's name removes it from the play view
    Given the player is editing a saved character with the Discipline "Presence" rated 3
    When they clear that Discipline's name
    And they activate "Done editing"
    Then the Disciplines card says "No Disciplines recorded · edit character to add"

  Scenario: Disciplines cannot be changed in play mode
    Given a saved character with the Discipline "Presence" rated 3
    And the player has that character's sheet open in play mode
    Then no Discipline name field or rating control is offered

  Scenario: Virtues are shown with their ratings
    Given a saved character with Conscience/Conviction 3, Self-Control/Instinct 3 and Courage 4
    When the player opens that character from the roster
    Then the Virtues card shows Conscience/Conviction 3, Self-Control/Instinct 3 and Courage 4, each out of 5 dots

  Scenario: Virtues are changed only while editing
    Given a saved character with Courage 4
    And the player has that character's sheet open in play mode
    Then the Courage rating cannot be changed
    When they activate "Edit character" and set Courage to 2
    And they activate "Done editing"
    Then the Virtues card shows Courage 2

  Scenario: Backgrounds are no longer offered
    Given the player is editing a saved character
    Then there is no field for any Background
