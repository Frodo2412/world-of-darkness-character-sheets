Feature: Combat tab

  Scenario: Manoeuvres show the character's pool
    Given a character with Dexterity 3 and Brawl 1 and a Hurt wound
    When the Combat tab is opened
    Then Strike shows "3 dice" with "Dexterity 3 + Brawl 1 − wound 1" on the Combat tab
    And its accuracy, difficulty and base damage are those of the rulebook on the Combat tab

  Scenario: Melee weapons list the rulebook entries with the character's pool
    Given a character with Dexterity 3 and Melee 0
    When the Combat tab is opened on Melee
    Then the Sap shows damage "Str +1", type "Bashing", concealment "P" and "3 dice" on the Combat tab
    And the Knife, Club, Sword, Axe and Stake are listed with their rulebook damage and concealment on the Combat tab

  Scenario: Ranged manoeuvres and weapons list the rulebook entries
    Given a character with Dexterity 3 and Firearms 2
    When the Combat tab is opened on Ranged
    Then a ranged manoeuvre shows its pool, accuracy, difficulty and damage as printed in the rulebook on the Combat tab
    And the light revolver shows damage "4", range "12", rate "3", clip "6" and concealment "P" on the Combat tab

  Scenario: Selecting a weapon and manoeuvre builds the attack pool
    Given a character with Dexterity 3 and Melee 0
    When the player selects the Sap and "Weapon Strike" on the Combat tab
    Then the attack pool reads "3 dice" with "Dexterity 3 + Melee 0" on the Combat tab
    And accuracy and difficulty are shown on the Combat tab

  Scenario: A row's Use in roll fills the Weapon roll panel
    Given a character with Dexterity 3 and Melee 0
    When the player presses "Use Sap in roll" on the Combat tab
    Then the Weapon roll panel holds the Sap on the Combat tab
    And the Sap row is marked "Selected" on the Combat tab

  Scenario: Modifiers, Target and Range change the pool and are forgotten on leaving
    Given the Weapon roll panel on the Combat tab showing an attack pool of 3 dice and difficulty 6
    When the player adds one die and raises the difficulty by one on the Combat tab
    Then the pool reads 4 dice and the difficulty 7 on the Combat tab
    When the player chooses a called-shot Target on the Combat tab
    Then the difficulty and the damage change as the rulebook's called-shot table says on the Combat tab
    When the player leaves the Combat tab and returns after a reload
    Then the modifiers are back to zero and the stored record is unchanged on the Combat tab

  Scenario: A ranged attack takes its difficulty from the range
    Given a character with Dexterity 3 and Firearms 2
    When the player selects the light revolver and chooses the long range on the Combat tab
    Then the difficulty is that of the long range band on the Combat tab

  Scenario: The damage pool adds the weapon and the extra successes
    Given a character with Strength 3
    When the player selects a weapon of Strength + 1 damage and enters 2 extra successes on the Combat tab
    Then the damage pool reads 6 dice on the Combat tab

  Scenario: Flat damage and a negative entry
    Given the Weapon roll panel on the Combat tab with a weapon of flat damage 4
    When the player enters -2 extra successes on the Combat tab
    Then the damage pool reads 4 dice and the entry is corrected with a message on the Combat tab

  Scenario: A manoeuvre the character cannot use says why
    Given a character with no Discipline power that grants claws
    When the Combat tab is opened
    Then Claw is marked "Unavailable" and states what it requires on the Combat tab
    And Weapon Strike is marked "Weapon required" on the Combat tab

  Scenario: A manoeuvre becomes usable when the requirement is met
    Given a character with Protean 2 and its claws power
    When the Combat tab is opened
    Then Claw is not marked unavailable on the Combat tab
    When the player selects the Sap on the Combat tab
    Then Weapon Strike no longer says "Weapon required" and uses the Sap on the Combat tab

  Scenario: Search and the section control narrow the tables
    Given a saved character
    When the Combat tab is opened
    And the player searches "stake" on the Combat tab
    Then the Stake remains in the weapons table and everything else is hidden on the Combat tab
    When the player searches "zzzz" on the Combat tab
    Then "No manoeuvres or weapons match." is shown on the Combat tab
    When the player clears the search and chooses "Ranged combat" on the Combat tab
    Then only the Ranged section is shown and the Ranged sub-tab is selected on the Combat tab

  Scenario: Leaving the tab forgets the search, and its clear button and count with it
    Given a saved character
    When the Combat tab is opened
    And the player searches "stake" on the Combat tab
    And the player leaves the Combat tab and returns without a reload
    Then the search is empty, with no clear button and no count on the Combat tab

  Scenario: An incapacitated character has no pools
    Given a character who is Incapacitated
    When the Combat tab is opened
    Then every attack and damage pool reads 0 and the panel says the character is incapacitated on the Combat tab

  Scenario: One level below incapacitated still floors the pool
    Given a character with Dexterity 3 and Brawl 1 and a Crippled wound
    When the Combat tab is opened
    Then Strike shows "0 dice" with "Dexterity 3 + Brawl 1 − wound 5" on the Combat tab

  Scenario: Nothing is rolled
    Given the Weapon roll panel on the Combat tab
    Then it has no control whose name contains "Roll" on the Combat tab
    And it says "Pools only — roll your own dice." on the Combat tab
    And repeated redraws show no random result on the Combat tab

  Scenario: The reminders and disclaimers are shown
    Given a saved character
    When the Combat tab is opened
    Then the reminders card lists range and cover, called shots, staking and grappling with page references on the Combat tab
    And "Base pools shown without Celerity, blood boosts, armor or situational modifiers" is shown on the Combat tab

  Scenario: The Combat tab is accessible and fits a phone
    Given a character with a weapon selected and modifiers entered on the Combat tab
    When the Combat tab is scanned for accessibility problems
    Then no problems are reported
    When the Combat tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
    And the reference tables scroll inside their own containers on the Combat tab
