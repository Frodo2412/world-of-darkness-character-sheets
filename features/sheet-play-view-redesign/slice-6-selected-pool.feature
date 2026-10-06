Feature: Selected pool

  Background:
    Given a saved character with Intelligence 4, Strength 1, Investigation 3, Brawl 0, Law 1 and the custom Knowledge "Art History" rated 2
    And the player has that character's sheet open in play mode

  Scenario: Nothing selected
    Then the Selected pool card says "Select an attribute and an ability"
    And it shows no dice total
    And the Attributes heading carries the hint "Select one attribute and one ability for a dice pool"

  Scenario: Only an attribute selected
    When they select Intelligence
    Then Intelligence is marked as selected
    And the Selected pool card shows "Intelligence 4" and says "Select an ability"
    And it shows no dice total

  Scenario: Only an ability selected
    When they select Investigation
    Then the Selected pool card shows "Investigation 3" and says "Select an attribute"

  Scenario: An attribute and an ability make a pool
    When they select Intelligence and Investigation
    Then the Selected pool card shows "Intelligence 4 + Investigation 3"
    And the dice total is "7 dice"

  Scenario: Wounds reduce the pool
    When they mark lethal damage on Hurt
    And they select Intelligence and Investigation
    Then the Selected pool card shows "Intelligence 4 + Investigation 3 − wound 1"
    And the dice total is "6 dice"

  Scenario: A bruise alone does not reduce the pool
    When they mark bashing damage on Bruised
    And they select Intelligence and Investigation
    Then the Selected pool card shows "Intelligence 4 + Investigation 3"
    And the dice total is "7 dice"

  Scenario: The pool follows the health track at once
    When they select Intelligence and Investigation
    And they mark bashing damage on Wounded
    Then the dice total is "5 dice"
    When they mark Wounded until it is empty
    Then the dice total is "7 dice"

  Scenario: Selecting another attribute replaces the first
    When they select Intelligence and Investigation
    And they select Strength
    Then Strength is marked as selected and Intelligence is not
    And the Selected pool card shows "Strength 1 + Investigation 3"

  Scenario: Selecting another ability replaces the first
    When they select Intelligence and Investigation
    And they select Law
    Then Law is marked as selected and Investigation is not
    And the dice total is "5 dice"

  Scenario: Selecting a selected trait deselects it
    When they select Intelligence and Investigation
    And they select Intelligence again
    Then Intelligence is not marked as selected
    And the Selected pool card shows "Investigation 3" and says "Select an attribute"

  Scenario: A pool of one die
    When they select Strength and Brawl
    Then the dice total is "1 die"

  Scenario: The pool never goes below zero
    When they mark lethal damage on Crippled
    And they select Strength and Brawl
    Then the Selected pool card shows "Strength 1 + Brawl 0 − wound 5"
    And the dice total is "0 dice"

  Scenario: An incapacitated character has no pool
    When they mark lethal damage on Incapacitated
    And they select Intelligence
    Then the Selected pool card says "Incapacitated · cannot act"
    When they select Investigation
    Then the dice total is "0 dice"
    And the Selected pool card says "Incapacitated · cannot act"

  Scenario: A named custom ability can be selected
    When they select Intelligence and "Art History"
    Then the Selected pool card shows "Intelligence 4 + Art History 2"
    And the dice total is "6 dice"

  Scenario: Virtues and Disciplines cannot be selected
    Then no Virtue row and no Discipline row offers selection

  Scenario: Selecting from the keyboard
    When they move keyboard focus to Intelligence and press Enter
    And they move keyboard focus to Investigation and press Space
    Then Intelligence and Investigation are reported as pressed to assistive technology
    And the Intelligence button is described as "4 of 5"
    And assistive technology is told "Dice pool: Intelligence 4 + Investigation 3, 7 dice"

  Scenario: The selection is shown without color alone
    When they select Intelligence
    Then the Intelligence row carries a selection edge that contrasts at least 3 to 1 with an unselected row

  Scenario: The pool stays in view on a narrow screen
    Given the sheet is shown on a 320 pixel wide screen
    When they select Intelligence and scroll to Investigation and select it
    Then the Selected pool card is visible without scrolling
    And the dice total is "7 dice"
    When they move keyboard focus through every ability
    Then no focused row is covered by the Selected pool card or the application bar

  Scenario: The selection is not saved
    When they select Intelligence and Investigation
    And they reload the sheet
    Then no trait is marked as selected
    And the Selected pool card says "Select an attribute and an ability"

  Scenario: Editing clears the selection
    When they select Intelligence and Investigation
    And they activate "Edit character"
    Then no trait offers selection and the Selected pool card is not shown
    When they activate "Done editing"
    Then no trait is marked as selected
    And the Selected pool card says "Select an attribute and an ability"
