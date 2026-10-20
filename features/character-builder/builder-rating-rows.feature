Feature: A rating is changed with named minus and plus buttons

  Every rating row has an Increase and a Decrease button named for its trait. A button that cannot
  act at the floor, the maximum or a lock stays focusable and says why in text; pressing it only
  announces the reason.

  Scenario: Increase and Decrease change a rating by one dot
    Given a player who has ranked Physical primary
    When they press Increase Strength
    Then Strength is rated 2
    And Physical has 6 dots remaining
    When they press Decrease Strength
    Then Strength is rated 1
    And Physical has 7 dots remaining

  Scenario: Each button is named for its trait
    Given a player who has ranked Physical primary
    Then Strength has the buttons "Decrease Strength" and "Increase Strength"

  Scenario: A rating at its floor cannot be lowered and says why when pressed
    Given a player who has ranked Physical primary
    Then Decrease Stamina is unavailable
    When they press Decrease Stamina
    Then Stamina is rated 1
    And the Physical group says "Stamina cannot go below 1."
    And Decrease Stamina is still on the page and can be focused

  Scenario: A rating at its maximum says "Maximum 5" beside the plus
    Given a 13th generation build with Physical ranked primary and Strength rated 5
    When they open the attributes step
    Then Increase Strength is unavailable
    And "Maximum 5" is shown beside Increase Strength
    And Increase Strength is described by "Maximum 5"
    When they press Increase Strength
    Then Strength is rated 5
    And the Physical group says "Strength cannot go above 5."

  Scenario: A plus below the maximum shows no limit
    Given a player who has ranked Physical primary
    Then Increase Strength is available
    And no limit is shown beside Increase Strength

  Scenario Outline: A button that becomes unavailable while focused keeps focus
    Given a 13th generation build with Physical ranked primary and Strength rated <before>
    When they open the attributes step
    And using only the keyboard they focus <button> Strength and press Enter <presses> times
    Then <button> Strength is unavailable
    And <button> Strength still has keyboard focus

    Examples:
      | before | button   | presses |
      | 3      | Increase | 2       |
      | 3      | Decrease | 2       |
